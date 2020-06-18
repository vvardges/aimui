#!/usr/bin/env sh
set -e

# Explicitly add installed Python packages and uWSGI Python packages to PYTHONPATH
# Otherwise uWSGI can't import Flask
export PYTHONPATH=$PYTHONPATH:/usr/local/lib/python3.7/site-packages:/usr/lib/python3.7/site-packages

# Generate Nginx config for maximum upload file size
printf "client_max_body_size 0;\n" > /etc/nginx/conf.d/upload.conf

export FLASK_ENV=prod
export FLASK_DEBUG=0
export FLASK_APP=/server/run.py
export TORNADO_ENV=prod

/bin/bash /docker-db-entrypoint.sh &
wait

cd /server && /env/bin/python manage.py db upgrade && cd -


/env/bin/python -m flask run --host=0.0.0.0 --port=43801 &

# Start Supervisor, with Nginx and uWSGI
exec /usr/bin/supervisord