from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from mapapi.models import District, Layer, Category, Object as ObjectModel, SocialDistrictStats


SOCIAL_SMOOTHING = 80.0


def social_score(education: int, health: int, culture: int, sport: int, commerce: int) -> float:
    # веса можно легко менять
    raw = (2.0 * education) + (2.0 * health) + (1.0 * culture) + (1.0 * sport) + (0.5 * commerce)
    if raw <= 0:
        return 0.0
    return 10.0 * (raw / (raw + SOCIAL_SMOOTHING))


class Command(BaseCommand):
    help = "Compute SocialDistrictStats for all districts based on imported social objects"

    @transaction.atomic
    def handle(self, *args, **options):
        social_layer = Layer.objects.filter(slug="social").first()
        if not social_layer:
            self.stderr.write("No Layer(slug='social') found.")
            return

        cats = {c.slug: c for c in Category.objects.filter(layer=social_layer)}
        needed = ["education", "health", "culture", "sport", "commerce"]
        if not all(slug in cats for slug in needed):
            self.stderr.write("Missing social categories. Need education/health/culture/sport/commerce.")
            return

        qs = (
            ObjectModel.objects
            .filter(layer=social_layer)
            .values("district_id", "category_id")
            .annotate(cnt=Count("id"))
        )

        counts = {}
        for row in qs:
            did = row["district_id"]
            cid = row["category_id"]
            cnt = int(row["cnt"])
            if did is None:
                continue
            if did not in counts:
                counts[did] = {k: 0 for k in needed}
            for slug in needed:
                if cid == cats[slug].id:
                    counts[did][slug] = cnt
                    break

        created = 0
        updated = 0

        for d in District.objects.all():
            c = counts.get(d.id, {k: 0 for k in needed})

            sc = round(
                social_score(
                    c["education"], c["health"], c["culture"], c["sport"], c["commerce"]
                ),
                1
            )

            obj, was_created = SocialDistrictStats.objects.update_or_create(
                district=d,
                defaults={
                    "education": c["education"],
                    "health": c["health"],
                    "culture": c["culture"],
                    "sport": c["sport"],
                    "commerce": c["commerce"],
                    "social_score": sc,
                },
            )

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Social stats done. created={created}, updated={updated}"))
