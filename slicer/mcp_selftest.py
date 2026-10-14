import anyio
from mcp import Client
from mcp_service import mcp

EXPECTED = {
    "get_upload_instructions",
    "inspect_model",
    "recommend_print_settings",
    "recommend_dice_tower",
    "build_dice_tower",
    "slice_model",
    "repair_model",
    "split_model",
}

async def main():
    async with Client(mcp, raise_exceptions=True) as client:
        tools = await client.list_tools()
        names = {tool.name for tool in tools.tools}
        missing = EXPECTED - names
        if missing:
            raise RuntimeError(f"Missing MCP tools: {sorted(missing)}")
        result = await client.call_tool("get_upload_instructions", {})
        if result.is_error:
            raise RuntimeError("get_upload_instructions self-test failed")
        print("RQS_MCP_SELFTEST", {"ok": True, "tools": sorted(names)}, flush=True)

if __name__ == "__main__":
    anyio.run(main)
