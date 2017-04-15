Install NodeJS 7.6.0
Make sure to add coffee as runtime dependency


```
#!/usr/bin/env bash

npm install --no-shrinkwrap || true
/usr/local/sbin/daemonize -E BUILD_ID=dontKillMe -c /var/lib/jenkins/jobs/start-comentarismo-reco/workspace -p /tmp/comentarismo-reco.pid /usr/local/bin/node /var/lib/jenkins/jobs/start-comentarismo-reco/workspace/dist
```