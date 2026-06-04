from django.core.management.base import BaseCommand
from django.db import transaction

from mapapi.models import District, Layer, Object as ObjectModel, NoiseDistrictStats


NOISE_SMOOTHING = 80.0


def noise_score(total_count: int) -> float:
    if total_count <= 0:
        return 10.0
    score = 10.0 * (1.0 - (total_count / (total_count + NOISE_SMOOTHING)))
    return round(score, 1)


class Command(BaseCommand):
    help = "Compute NoiseDistrictStats for all districts based on imported noise complaints"

    @transaction.atomic
    def handle(self, *args, **options):
        noise_layer = Layer.objects.filter(slug="noise").first()
        if not noise_layer:
            self.stderr.write("No Layer(slug='noise') found.")
            return

        qs = (
            ObjectModel.objects
            .filter(layer=noise_layer)
            .select_related("district")
        )

        grouped = {}

        for obj in qs:
            if not obj.district_id:
                continue

            if obj.district_id not in grouped:
                grouped[obj.district_id] = 0

            grouped[obj.district_id] += 1

        created = 0
        updated = 0

        for d in District.objects.all():
            total = grouped.get(d.id, 0)
            score = noise_score(total)

            _, was_created = NoiseDistrictStats.objects.update_or_create(
                district=d,
                defaults={
                    "total_complaints": total,
                    "construction_count": 0,
                    "road_repair_count": 0,
                    "ventilation_count": 0,
                    "loading_count": 0,
                    "other_count": total,
                    "noise_score": score,
                },
            )

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Noise stats done. created={created}, updated={updated}"
            )
        )