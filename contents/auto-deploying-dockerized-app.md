<!-- tags: docker, webhooks, deployment, python, docker-py, sakuya, dev, code -->
<!-- title: Auto-deploying your dockerized app -->

# Auto-deploying your dockerized app

This article will explain how you can automate your app deployment using
[docker-py](http://github.com/docker/docker-py) and the
[Docker Hub](http://hub.docker.com). This is what I currently use to automatically
update my blog and deploy it on [joffrey.eu](http://joffrey.eu).

## Pre-requisites

* A Docker Hub account (it's free, so no reason to not have one!)
* A server with Docker installed and the possibility to expose a TCP port
  (we're going to have a python app listening for HTTP requests).
* A modicum of python-fu!

## Create and configure our repo on Docker Hub

We can either create a [standard repository](https://registry.hub.docker.com/account/repositories/add/)
to which we will be pushing manually, or an [automated build](https://registry.hub.docker.com/builds/add/)
that will pull our code from Github/Bitbucket and build our container automatically.
Both are fine!

Once our repository is created, we need to access the repository page
(it should look something like `http://registry.hub.docker.com/u/<repo_name>`).
In the right hand side menu, there's a link called "Webhooks" that we'll want to click.

We're going to set up a very simple webhook that sends just one request to our server
informing it that there's been an update to our repository.

![Simple webhook chain](http://i.imgur.com/S7bc417.png)

Fill in a friendly short name that will remind you of what it does, and enter the URL
in the second field after having adjusted the hostname accordingly.

Now we just have to set up a small HTTP server to receive the request and deploy our
updates.

## Flask server

I'm using 2 dependencies for this server:
* [Flask](http://flask.pocoo.org/), a python web micro-framework that lets us set up
an HTTP server in just a few lines of code.
* [docker-py](http://github.com/docker/docker-py), a python client for the Docker daemon.
  it allows us to start and stop containers, pull images, and all sorts of
  other useful things.

### requirements.txt:

```
docker-py===0.7.0
flask==0.10.1
```

I defer the deployment task after receiving the HTTP request in an asynchronous
process using the [`multiprocessing` python module](https://docs.python.org/2/library/multiprocessing.html).
For better scaling solutions, look towards Celery instead.

### autodeployer.py:

```python
from flask import Flask, request, abort
from multiprocessing import Pool
import json

import docker
import requests

app = Flask(__name__)
repository_whitelist = ['myname/myrepo']

def deploy(payload):
    repo_name = payload['repository']['repo_name']
    container_name = repo_name.replace('/', '-')
    with docker.Client() as c:
        try:
            print 'Pulling {0}'.format(repo_name)
            for chunk in c.pull(repo_name, stream=True):
                print chunk
            print 'Pulled image.'
            print 'Finding any old version of the container currently running'
            stop_candidates = [container['Id'] for container in c.containers(all=True) if ('/' + container_name) in container['Names']]
            print 'Removing {0} containers'.format(len(stop_candidates))
            for container in stop_candidates:
                c.stop(container, timeout=3)
                print 'Stopped {0}'.format(container)
                c.remove_container(container, force=True)
                print'Removed {0}'.format(container)
            print 'Creating container'
            ctnr = c.create_container(
                repo_name, ports=[1990], name=container_name,
                host_config=docker.utils.create_host_config(port_bindings={1990: 1990})
            )
            print 'Starting new container...'
            c.start(ctnr)
            print 'Sending callback...'
            requests.post(
                payload['callback_url'],
                data=json.dumps({'state': 'success', 'context': ctnr['Id'] }),
                headers={'Content-Type': 'application/json'}
            )
        except Exception as e:
            requests.post(
                payload['callback_url'],
                data=json.dumps({'state': 'error', description: str(e)}),
                headers={'Content-Type': 'application/json'}
            )
            print e
        print 'deploy done'

pool = Pool(processes=3)

@app.route('/deploy', methods=['POST'])
def webhook_receiver():
    data = request.data
    if not data:
        abort(400)
    payload = json.loads(data)
    if not payload.get('repository') or not payload['repository'].get('repo_name'):
        abort(400)
    if payload['repository']['repo_name'] not in repository_whitelist:
        abort(422)
    pool.apply_async(deploy, [payload])
    return '"ok"'



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3456)
```

Starting with the `webhook_receiver()` method &ndash; the decorator simply
states that POST requests on the `/deploy` endpoint will be processed by this
request. Other requests will result in status 404 or 405. We do a few checks
on the data we received to make sure it is well-formed and expected.

If everything passes, we start the `deploy()` method in one of our worker processes
(we have a pool of 3 configured to handle concurrent requests just in case),
and send a 200 "ok" response to inform the Docker Hub that we've received the request.

Now for `deploy()` &ndash; there's quite a few things happening here at first glance,
but it's all really simple. The first step is creating a client for the Docker daemon
in the `with` statement (that way the connection gets closed whenever we exit the block).
Using this client, we:
* Pull the latest version of the repository
* Retrieve a container that was previously created with the same name, and if it exists,
  stop then remove it.
* Create a new container with the image we just pulled and a few options
  (here specifically, I'm mapping the port 1990 that my application is using to the
  same port on the host. If you need to use different ports, adapt the code accordingly)
* Start the container.

That's it, our container is now running and our app ready to talk with the real world!
To complete the process, we contact the callback_url the hub has given us and reply
with our newly created container ID, changing the Webhook status from
"pending" to "success"!

If anything goes wrong during the deployment, we make sure to catch the exception
and handle it by posting to the callback URL with some information on the issue we
encountered. If we were going to production, we'd probably want to have all sorts
of alerts in there to inform us that things have gone horribly wrong!

All that's left to do is start the server with `python autodeployer.py`. To check
that everything's working properly, we can trigger a test payload from the Webhooks
page on Docker Hub.