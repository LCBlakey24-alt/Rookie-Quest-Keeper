import ast
from pathlib import Path


SERVER_PATH = Path(__file__).resolve().parents[1] / 'server.py'


def _async_function(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name:
            return node
    raise AssertionError(f'Missing async function: {name}')


def test_startup_event_schedules_maintenance_without_awaiting_it():
    tree = ast.parse(SERVER_PATH.read_text(encoding='utf-8'))
    startup = _async_function(tree, 'startup_event')

    assert not any(isinstance(node, ast.Await) for node in ast.walk(startup))
    create_task_calls = [
        node for node in ast.walk(startup)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == 'asyncio'
        and node.func.attr == 'create_task'
    ]
    assert len(create_task_calls) == 1
    scheduled = create_task_calls[0].args[0]
    assert isinstance(scheduled, ast.Call)
    assert isinstance(scheduled.func, ast.Name)
    assert scheduled.func.id == 'run_startup_maintenance'


def test_database_setup_remains_inside_background_maintenance():
    source = SERVER_PATH.read_text(encoding='utf-8')
    tree = ast.parse(source)
    maintenance = _async_function(tree, 'run_startup_maintenance')
    maintenance_source = ast.get_source_segment(source, maintenance) or ''

    assert "db.command('ping')" in maintenance_source
    assert 'initialize_rule_systems' in maintenance_source
    assert 'seed_templates_if_empty' in maintenance_source
    assert 'create_index' in maintenance_source
    assert any(isinstance(node, ast.Await) for node in ast.walk(maintenance))
