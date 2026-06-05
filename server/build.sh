#!/usr/bin/env bash
set -e

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py import_districts
python manage.py loaddata mapapi/fixtures/initial_data.json
python manage.py loaddata mapapi/fixtures/objects_data.json