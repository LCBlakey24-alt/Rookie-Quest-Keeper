from models import PlayerCharacterUpdate


def test_character_update_accepts_nested_feat_ability_metadata():
    update = PlayerCharacterUpdate(
        feats=[
            {
                "name": "Flexible Athlete",
                "description": "Choose Strength or Dexterity.",
                "ability_score_increase": {
                    "choose": 1,
                    "from": ["strength", "dexterity"],
                    "amount": 1,
                },
                "ability_score_choices": ["dexterity"],
            }
        ]
    )

    feat = update.model_dump(exclude_none=True)["feats"][0]
    assert feat["ability_score_increase"]["choose"] == 1
    assert feat["ability_score_increase"]["from"] == ["strength", "dexterity"]
    assert feat["ability_score_choices"] == ["dexterity"]
