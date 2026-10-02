from models import LocalMapCreate, LocalMapUpdate, WorldMapCreate, WorldMapUpdate


def test_world_map_models_accept_storage_urls_without_dropping_legacy_data():
    created = WorldMapCreate(
        name="Realm",
        image_data="data:image/jpeg;base64,legacy",
        image_url="https://storage.example/world.jpg",
    )
    assert created.image_url == "https://storage.example/world.jpg"
    assert created.image_data.startswith("data:image/jpeg")

    updated = WorldMapUpdate(image_url="https://storage.example/new-world.jpg")
    assert updated.image_url == "https://storage.example/new-world.jpg"


def test_local_map_models_accept_storage_urls():
    created = LocalMapCreate(
        location_id="location-1",
        name="Town",
        image_url="https://storage.example/town.jpg",
    )
    assert created.image_url == "https://storage.example/town.jpg"

    updated = LocalMapUpdate(image_url="https://storage.example/new-town.jpg")
    assert updated.image_url == "https://storage.example/new-town.jpg"
