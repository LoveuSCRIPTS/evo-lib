local ResourceName = GetCurrentResourceName()

local function Notify(playerId, message, nType, duration, options)
    if type(playerId) ~= 'number' or playerId <= 0 then return end
    TriggerClientEvent('EvoLib:Notify', playerId, message, nType, duration, options)
end

exports('Notify', Notify)

AddEventHandler('onResourceStart', function(res)
    if res ~= ResourceName then return end
    print(('^2[%s]^7 server started. Exports: Notify, ProgressBar, ProgressCircle, Menu'):format(ResourceName))
end)

-- Simple one-shot server exports targeting one player
local function ProgressBar(playerId, duration, label, options)
    if type(playerId) ~= 'number' or playerId <= 0 then return end
    TriggerClientEvent('EvoLib:ProgressBar', playerId, duration, label, options)
end

local function ProgressCircle(playerId, duration, label, options)
    if type(playerId) ~= 'number' or playerId <= 0 then return end
    TriggerClientEvent('EvoLib:ProgressCircle', playerId, duration, label, options)
end

exports('ProgressBar', ProgressBar)
exports('ProgressCircle', ProgressCircle)

-- Unified Menu (server-side helper)
local _pendingMenus = {}
local _menuSeq = 0

-- server export: Menu(playerId, payload, cb)
-- payload matches client Menu payload (kind = 'confirm'|'select'|'input'|'multiselect'|'category', etc.)
-- cb(resultTable | nil) is invoked when the player chooses or times out
local function Menu(playerId, payload, cb)
    if type(playerId) ~= 'number' or playerId <= 0 then return end
    if type(cb) ~= 'function' then
        print(('^3[%s]^7 Menu called without callback. Nothing to return.'):format(ResourceName))
        return
    end
    _menuSeq = (_menuSeq + 1) % 1000000
    local reqId = ('%d:%d:%d'):format(playerId, os.time(), _menuSeq)
    _pendingMenus[reqId] = cb
    TriggerClientEvent('EvoLib:MenuOpen', playerId, reqId, payload or {})
    -- Fallback timeout after 60s to prevent leaks
    SetTimeout(60000, function()
        local f = _pendingMenus[reqId]
        if f then
            _pendingMenus[reqId] = nil
            pcall(f, nil)
        end
    end)
end

RegisterNetEvent('EvoLib:MenuResult', function(reqId, result)
    local src = source
    local cb = _pendingMenus[reqId]
    if cb then
        _pendingMenus[reqId] = nil
        -- protect against errors in user callback
        local ok, err = pcall(cb, result)
        if not ok then
            print(('^1[%s]^7 Menu callback error: %s'):format(ResourceName, err))
        end
    end
end)

exports('Menu', Menu)
