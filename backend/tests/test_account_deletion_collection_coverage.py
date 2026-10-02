from pathlib import Path
import ast


ROOT = Path(__file__).resolve().parents[1]
AUTH_SOURCE = (ROOT / "routes" / "auth.py").read_text(encoding="utf-8")


def _user_owned_collections():
    tree = ast.parse(AUTH_SOURCE)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "USER_OWNED_COLLECTIONS":
                    return ast.literal_eval(node.value)
    raise AssertionError("USER_OWNED_COLLECTIONS was not found")


def test_account_deletion_covers_newer_user_owned_collections():
    collections = set(_user_owned_collections())

    assert {
        "user_npcs",
        "user_monsters",
        "user_custom_rules",
        "improvement_feedback",
        "players",
    }.issubset(collections)
