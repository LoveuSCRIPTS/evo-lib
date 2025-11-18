local ResourceName = GetCurrentResourceName()

local function normalizeAccent(color)
    if type(color) ~= 'string' then return nil end
    local hex = color:gsub('#',''):lower()
    if #hex == 8 then hex = hex:sub(3) end -- support AARRGGBB by dropping alpha
    if #hex == 6 and hex:match('^%x%x%x%x%x%x$') then
        return '#' .. hex
    end
    return nil
end

-- Notify
local function Notify(message, nType, duration, options)
    local opts = options or {}
    local s = (Config and Config.Notify and Config.Notify.Sound) and Config.Notify.Sound or nil
    local soundEnabled = (opts.playSound ~= nil) and opts.playSound or (s and s.Enabled) or false
    local soundFile = opts.soundFile or (s and s.File) or nil
    local soundVolume = tonumber(opts.volume) or (s and s.Volume) or 0.6
    local payload = {
        action = 'notify',
        title = (opts.title and tostring(opts.title)) or nil,
        message = tostring(message or ''),
        nType = (nType or 'info'),
        duration = tonumber(duration) or ((Config and Config.Notify and Config.Notify.DefaultDuration) or 4000),
        position = opts.position or ((Config and Config.Notify and Config.Notify.Position) or 'top-right'),
        accentColor = (function()
            local o = normalizeAccent(opts.accentColor)
            if o then return o end
            if (Config and Config.Theme and Config.Theme.BrandTheme and Config.Theme.BrandNotify) then
                return normalizeAccent(Config.Theme.AccentColor)
            end
            return nil
        end)(),
        style = opts.style or ((Config and Config.Notify and Config.Notify.Style) or 'card'),
        className = opts.className,
        sound = (soundEnabled and soundFile) and { enabled = true, file = tostring(soundFile), volume = soundVolume } or { enabled = false }
    }
    SendNUIMessage(payload)
end

exports('Notify', Notify)
RegisterNetEvent('EvoLib:Notify', function(message, nType, duration, options)
    Notify(message, nType, duration, options)
end)

-- One-shot progress APIs
local function ProgressBar(duration, label, options)
    duration = tonumber(duration) or 0
    local opts = options or {}
    local show = options and options.showPercent
    if show == nil then show = options and options.showCountdown end
    SendNUIMessage({
        action = 'progress', kind = 'bar', cmd = 'run',
        label = label and tostring(label) or '',
        duration = duration,
        position = opts.position or (((Config and Config.Progress and Config.Progress.Bar and Config.Progress.Bar.DefaultPosition) or 'top-center')),
        minimal = (opts.minimal ~= nil) and opts.minimal or (((Config and Config.Progress and Config.Progress.Bar and Config.Progress.Bar.Minimal) or true)),
        showPercent = (show ~= nil) and show or (((Config and Config.Progress and Config.Progress.Bar and Config.Progress.Bar.ShowCountdown) or true)),
        accentColor = normalizeAccent(opts.accentColor) or ((((Config and Config.Theme and Config.Theme.BrandTheme) and normalizeAccent(Config.Theme.AccentColor)) or nil)),
        compact = opts.compact or false,
        className = opts.className,
        -- optional easing tweaks (fallback to config when available)
        easeStart = tonumber(opts.easeStart) or (((Config and Config.Progress and Config.Progress.Bar and Config.Progress.Bar.Easing and Config.Progress.Bar.Easing.Start) or nil)),
        easeEnd = tonumber(opts.easeEnd) or (((Config and Config.Progress and Config.Progress.Bar and Config.Progress.Bar.Easing and Config.Progress.Bar.Easing.EndSlope) or nil))
    })
end

local function ProgressCircle(duration, label, options)
    duration = tonumber(duration) or 0
    local opts = options or {}
    local show = options and options.showPercent
    if show == nil then show = options and options.showCountdown end
    SendNUIMessage({
        action = 'progress', kind = 'circle', cmd = 'run',
        label = label and tostring(label) or '',
        duration = duration,
        position = opts.position or (((Config and Config.Progress and Config.Progress.Circle and Config.Progress.Circle.DefaultPosition) or 'center')),
        size = tonumber(opts.size) or (((Config and Config.Progress and Config.Progress.Circle and Config.Progress.Circle.Size) or 120)),
        thickness = tonumber(opts.thickness) or (((Config and Config.Progress and Config.Progress.Circle and Config.Progress.Circle.Thickness) or 10)),
        showPercent = (show ~= nil) and show or (((Config and Config.Progress and Config.Progress.Circle and Config.Progress.Circle.ShowCountdown) or true)),
        accentColor = normalizeAccent(opts.accentColor) or ((((Config and Config.Theme and Config.Theme.BrandTheme) and normalizeAccent(Config.Theme.AccentColor)) or nil)),
        className = opts.className
    })
end

exports('ProgressBar', ProgressBar)
exports('ProgressCircle', ProgressCircle)
RegisterNetEvent('EvoLib:ProgressBar', function(duration, label, options) ProgressBar(duration, label, options) end)
RegisterNetEvent('EvoLib:ProgressCircle', function(duration, label, options) ProgressCircle(duration, label, options) end)

AddEventHandler('onClientResourceStart', function(res)
    if res ~= ResourceName then return end
    SendNUIMessage({
        action = 'config',
        position = ((Config and Config.Notify and Config.Notify.Position) or 'top-right'),
        max = ((Config and Config.Notify and Config.Notify.MaxShown) or 5),
        accentColor = (((Config and Config.Theme and Config.Theme.BrandTheme) and normalizeAccent(Config.Theme.AccentColor)) or nil),
        style = ((Config and Config.Notify and Config.Notify.Style) or 'card')
    })
end)

-- Live update for open Category menu
local function MenuUpdateCategory(id, data)
    if not id then return end
    SendNUIMessage({ action = 'menuUpdate', kind = 'category', id = tostring(id), progress = data and data.progress or nil, stats = data and data.stats or nil })
end

exports('MenuUpdateCategory', MenuUpdateCategory)
RegisterNetEvent('EvoLib:MenuUpdateCategory', function(id, data) MenuUpdateCategory(id, data) end)

-- Menu (blocks until user chooses or cancels)
local _menuState = nil
local _menuPromise = nil
local _hasPromise = (type(promise) == 'table' and type(promise.new) == 'function' and type(Citizen) == 'table' and type(Citizen.Await) == 'function')

RegisterNUICallback('menuResult', function(data, cb)
    cb(1)
    if _menuState then
        _menuState.result = data
        _menuState.done = true
    end
    if _menuPromise then
        _menuPromise:resolve(data)
        _menuPromise = nil
    end
end)

local function Menu(payload)
    if _menuState then return nil end -- already open
    _menuState = { done = false, result = nil }
    local opts = payload or {}
    local acc = normalizeAccent(opts.accentColor) or ((((Config and Config.Theme and Config.Theme.BrandTheme) and normalizeAccent(Config.Theme.AccentColor)) or nil))
    SendNUIMessage({
        action = 'menu',
        kind = opts.kind or 'confirm',
        title = opts.title or '',
        message = opts.message or '',
        yesLabel = opts.yesLabel or 'Yes',
        noLabel = opts.noLabel or 'No',
        options = opts.options or {},
        accentColor = acc,
        className = opts.className
    })
    SetNuiFocus(true, true)
    local res
    if _hasPromise then
        local p = promise.new()
        _menuPromise = p
        res = Citizen.Await(p)
    else
        while not _menuState.done do
            Citizen.Wait(5)
        end
        res = _menuState.result
    end
    SetNuiFocus(false, false)
    _menuState = nil
    return res
end

exports('Menu', Menu)

-- Server-initiated menu request -> respond back with result
RegisterNetEvent('EvoLib:MenuOpen', function(reqId, payload)
    local res = Menu(payload)
    TriggerServerEvent('EvoLib:MenuResult', reqId, res)
end)

-- Context menu API (ID-based registration, evo UI)
local _contextMenus = {}
local _openContextId = nil
local _contextStack = {}

---@class EvoContextMenuItem
---@field title? string
---@field menu? string
---@field icon? string
---@field description? string
---@field disabled? boolean
---@field readOnly? boolean
---@field event? string
---@field serverEvent? string
---@field onSelect? fun(args: any)
---@field args? any

---@class EvoContextMenuProps
---@field id string
---@field title string
---@field menu? string
---@field canClose? boolean
---@field onExit? fun()
---@field onBack? fun()
---@field options table<number, EvoContextMenuItem> | EvoContextMenuItem[] | table<string, EvoContextMenuItem>

local function _normalizeOptions(opts)
    -- Accept array or map; always return array with id and fields UI expects
    local list = {}
    local idx = 0
    if type(opts) ~= 'table' then return list end
    local isArray = (opts[1] ~= nil)
    if isArray then
        for i = 1, #opts do
            local it = opts[i]
            if type(it) == 'table' then
                list[#list+1] = {
                    __index = i,
                    id = tostring(i),
                    label = tostring(it.title or it.label or ('Option '..i)),
                    description = it.description and tostring(it.description) or nil,
                    icon = it.icon and tostring(it.icon) or nil,
                    disabled = it.disabled == true,
                    readOnly = it.readOnly == true,
                    __raw = it,
                }
            end
        end
    else
        for k, it in pairs(opts) do
            if type(it) == 'table' then
                idx += 1
                list[#list+1] = {
                    __index = idx,
                    id = tostring(k),
                    label = tostring(it.title or it.label or tostring(k)),
                    description = it.description and tostring(it.description) or nil,
                    icon = it.icon and tostring(it.icon) or nil,
                    disabled = it.disabled == true,
                    readOnly = it.readOnly == true,
                    __raw = it,
                }
            end
        end
        table.sort(list, function(a, b) return tostring(a.id) < tostring(b.id) end)
    end
    return list
end

-- Register one or many contexts (accepts single object or array)
local function RegisterContext(context)
    if type(context) ~= 'table' then return end
    local isMany = (context[1] ~= nil)
    if isMany then
        for i = 1, #context do
            local v = context[i]
            if type(v) == 'table' and v.id and v.title then
                _contextMenus[v.id] = v
            end
        end
    else
        if context.id and context.title then
            _contextMenus[context.id] = context
        end
    end
end

-- Returns the id of the currently open context, if any
local function GetOpenContextMenu()
    return _openContextId
end

-- Hide the current context (closes evo modal and triggers onExit)
local function HideContext(onExit)
    if onExit == nil then onExit = true end
    if not _openContextId then return end
    -- Close current UI modal if open
    SendNUIMessage({ action = 'closeMenu' })
    SetNuiFocus(false, false)
    local id = _openContextId
    _openContextId = nil
    if onExit and _contextMenus[id] and type(_contextMenus[id].onExit) == 'function' then
        pcall(_contextMenus[id].onExit)
    end
end

-- Show a registered context using evo's Select UI and ID-based option handling
local function ShowContext(id)
    local data = _contextMenus[id]
    if not data then print(('[evo-lib] No context menu registered for id "%s"'):format(tostring(id))) return nil end
    _openContextId = id
    _contextStack = {}

    ::openAgain::
    -- Build UI payload
    local options = _normalizeOptions(data.options)
    local payload = {
        kind = 'select',
        title = data.title or '',
        options = options,
        canClose = (data.canClose ~= false),
        backButton = (#_contextStack > 0),
        accentColor = ((Config and Config.Theme and Config.Theme.BrandTheme) and normalizeAccent(Config.Theme.AccentColor)) or nil,
    }
    local res = Menu(payload)

    if not res or res.id == nil then
        local prev = _openContextId
        _openContextId = nil
        if prev and data.onExit and type(data.onExit) == 'function' then
            pcall(data.onExit)
        end
        return
    end

    -- Handle back navigation
    if res.id == '__back' then
        local prevId = table.remove(_contextStack)
        if not prevId then
            _openContextId = nil
            if data.onExit and type(data.onExit) == 'function' then
                pcall(data.onExit)
            end
            return
        end
        id = prevId
        data = _contextMenus[id]
        if not data then
            _openContextId = nil
            return
        end
        _openContextId = id
        goto openAgain
    end

    -- Find selection
    local selected
    for i = 1, #options do
        if tostring(options[i].id) == tostring(res.id) then
            selected = options[i].__raw
            break
        end
    end
    if not selected then
        _openContextId = nil
        return
    end

    -- If nested menu is present, optionally call onBack and open nested
    if selected.menu then
        -- push current id and open nested
        table.insert(_contextStack, id)
        id = tostring(selected.menu)
        data = _contextMenus[id]
        if not data then
            _openContextId = nil
            return
        end
        _openContextId = id
        goto openAgain
    end

    -- Close the UI and dispatch handlers
    SendNUIMessage({ action = 'closeMenu' })
    SetNuiFocus(false, false)
    _openContextId = nil
    _contextStack = {}

    if selected.onSelect and type(selected.onSelect) == 'function' then
        pcall(selected.onSelect, selected.args)
    end
    if selected.event then
        TriggerEvent(selected.event, selected.args)
    end
    if selected.serverEvent then
        TriggerServerEvent(selected.serverEvent, selected.args)
    end
end

-- Expose exports with evo-friendly names
exports('RegisterContext', RegisterContext)
exports('ShowContext', ShowContext)
exports('HideContext', HideContext)
exports('GetOpenContextMenu', GetOpenContextMenu)

-- Runtime theme overrides (advanced): set CSS vars on the fly
local function Theme(vars)
    if type(vars) == 'table' then
        SendNUIMessage({ action = 'theme', vars = vars })
    end
end
exports('Theme', Theme)

-- Also expose as events for convenience
RegisterNetEvent('EvoLib:RegisterContext', function(ctx) RegisterContext(ctx) end)
RegisterNetEvent('EvoLib:ShowContext', function(id) ShowContext(id) end)
RegisterNetEvent('EvoLib:HideContext', function(onExit) HideContext(onExit) end)
RegisterNetEvent('EvoLib:Theme', function(vars) Theme(vars) end)
