#!/usr/bin/env bash

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py import_districts
python manage.py import_ecology
python manage.py import_social
python manage.py import_noise
python manage.py compute_eco_stats
python manage.py compute_social_stats
python manage.py compute_noise_stats