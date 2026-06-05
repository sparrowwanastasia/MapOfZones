#!/usr/bin/env bash

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate

python manage.py import_districts

python manage.py import_ecology --api-key "$DATA_MOS_API_KEY"
python manage.py import_social --api-key "$DATA_MOS_API_KEY"
python manage.py import_noise --api-key "$DATA_MOS_API_KEY"

python manage.py compute_eco_stats
python manage.py compute_social_stats
python manage.py compute_noise_stats