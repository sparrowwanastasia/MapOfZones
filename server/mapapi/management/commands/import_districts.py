import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from mapapi.models import District


class Command(BaseCommand):
    help = "Import Moscow districts from GeoJSON"

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[3]

        possible_paths = [
            base_dir / "data" / "moscow_districts.geojson",
            base_dir / "mapapi" / "data" / "moscow_districts.geojson",
        ]

        file_path = next((path for path in possible_paths if path.exists()), None)

        if file_path is None:
            self.stderr.write(self.style.ERROR("moscow_districts.geojson not found"))
            return

        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for feature in data.get("features", []):
            properties = feature.get("properties", {})

            name = (
                properties.get("name")
                or properties.get("NAME")
                or properties.get("NAME_RU")
                or properties.get("district")
                or properties.get("DISTRICT")
                or properties.get("район")
            )

            if not name:
                skipped_count += 1
                self.stderr.write(
                    self.style.WARNING(
                        f"Skipped feature without district name. Properties: {properties}"
                    )
                )
                continue

            name = str(name).strip().lower()
            slug = slugify(name, allow_unicode=True)

            _, created = District.objects.update_or_create(
                slug=slug,
                defaults={"name": name},
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Districts imported. Created: {created_count}, "
                f"updated: {updated_count}, skipped: {skipped_count}"
            )
        )