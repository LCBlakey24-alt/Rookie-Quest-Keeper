from models import NPC, NPCCreate, NPCUpdate


def test_npc_create_read_and_update_preserve_verified_portrait():
    image = "data:image/jpeg;base64,confirmed-portrait"
    created = NPCCreate(name="Lucian Grey", image_url=image, portrait_url=image)
    assert created.image_url == image
    saved = NPC(campaign_id="eldritch-heralds", **created.model_dump())
    assert saved.image_url == image
    assert saved.portrait_url == image
    assert NPC.model_validate(saved.model_dump()).image_url == image
    patch = NPCUpdate(image_url="https://example.invalid/new-image.jpg")
    assert patch.model_dump(exclude_none=True) == {"image_url": "https://example.invalid/new-image.jpg"}


def test_npc_without_portrait_remains_valid():
    npc = NPC(campaign_id="eldritch-heralds", name="Unknown NPC")
    assert npc.image_url == ""
    assert npc.portrait_url == ""
