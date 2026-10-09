local logger     = require("logger")
local millennium = require("millennium")
local utils      = require("utils")

-- define the RPC functions
require("rpc_functions")

local function on_load()
    logger:info("Loaded with Millennium version " .. millennium.version())
    millennium.ready()
end

-- Called when your plugin is unloaded. This happens when the plugin is disabled or Steam is shutting down.
-- NOTE: If Steam crashes or is force closed by task manager, this function may not be called -- so don't rely on it for critical cleanup.
local function on_unload()
    logger:info("Plugin unloaded")
end

-- Called when the Steam UI has fully loaded.
local function on_frontend_loaded()
    logger:info("Frontend load notification received!")
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload,
}
