#!/bin/bash

# Init DB
/bin/bash /docker-db-entrypoint.sh &
wait

# Run server services
cd /server

pip install -r requirements.txt

export FLASK_ENV=dev
export FLASK_APP=/server/run.py
export FLASK_DEBUG=1
export TORNADO_ENV=dev

python manage.py db upgrade

flask run --host=0.0.0.0 --port=43801 &
python run_ws.py &

# Run client services
cd /client

npm install

HOST=0.0.0.0 PORT=43800 HTTPS=false node /client/scripts/start.js
