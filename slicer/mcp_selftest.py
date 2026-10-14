import anyio
from mcp import Client
from mcp_service import mcp, _authorized_token, MCP_SIGNING_SECRET
from connector_auth import issue_token

EXPECTED = {
    "get_upload_instructions",
    "inspect_model",
    "get_model_views",
    "recommend_print_settings",
    "recommend_dice_tower",
    "build_dice_tower",
    "slice_model",
    "repair_model",
    "split_model",
}

async def main():
    if MCP_SIGNING_SECRET:
        signed, payload = issue_token(MCP_SIGNING_SECRET, "Startup Test", 1, now=1000)
        if not _authorized_token(signed):
            # _authorized_token checks against current real time, so make a fresh token too.
            signed, payload = issue_token(MCP_SIGNING_SECRET, "Startup Test", 1)
        if not _authorized_token(signed):
            raise RuntimeError("Signed connector token self-test failed")
        expired, _ = issue_token(MCP_SIGNING_SECRET, "Expired Test", 1, now=1)
        if _authorized_token(expired):
            raise RuntimeError("Expired connector token was incorrectly accepted")

    async with Client(mcp, raise_exceptions=True) as client:
        tools = await client.list_tools()
        names = {tool.name for tool in tools.tools}
        missing = EXPECTED - names
        if missing:
            raise RuntimeError(f"Missing MCP tools: {sorted(missing)}")
        result = await client.call_tool("get_upload_instructions", {})
        if result.is_error:
            raise RuntimeError("get_upload_instructions self-test failed")
        print("RQS_MCP_SELFTEST", {"ok": True, "signed_tokens": bool(MCP_SIGNING_SECRET), "tools": sorted(names)}, flush=True)

if __name__ == "__main__":
    anyio.run(main)
