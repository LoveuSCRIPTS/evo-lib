Evo‑lib — UI Toolkit (Notify, Progress, Menu)
============================================

Elegant, fast UI helpers for FiveM/QBCore: notifications, progress, and menus (unified + ID‑based context).

Install
-------
- Place `evo-lib` in `resources/[standalone]`.
- Ensure in server.cfg: `ensure [standalone]` or `ensure evo-lib`.
- No extra UI config is required.

Client Exports (overview)
------------------------
- `Notify(message, type?, duration?, options?)`
- `ProgressBar(duration, label?, options?)`
- `ProgressCircle(duration, label?, options?)`
- `Menu(payload)` — confirm | select | input | multiselect | category
- `MenuUpdateCategory(id, data)`
- `RegisterContext(contextOrArray)` | `ShowContext(id)` | `HideContext(onExit?)` | `GetOpenContextMenu()`
- `Theme(vars)` — runtime CSS variables (advanced)

Server Exports (overview)
------------------------
- `Notify(playerId, message, type?, duration?, options?)`
- `ProgressBar(playerId, duration, label?, options?)`
- `ProgressCircle(playerId, duration, label?, options?)`
- `Menu(playerId, payload, cb)` — invokes callback with result or `nil` on timeout (60s)

Quick Start
-----------
```
-- Notify
exports['evo-lib']:Notify('Hello world!', 'info', 3000, { position = 'top-center', style = 'square' })

-- Progress (bar)
exports['evo-lib']:ProgressBar(5000, 'Crafting...', { minimal = true, showCountdown = true })

-- Menu (confirm)
local res = exports['evo-lib']:Menu({ kind = 'confirm', title = 'Use item?', message = 'This will use 1x item.' })
if res and res.type == 'confirm' and res.accepted then print('OK') end
```

Notifications
-------------
- Types: `info` | `success` | `warning` | `error`
- Options:
  - `position`: `top-right` | `top-left` | `bottom-right` | `bottom-left` | `top-center` | `bottom-center`
  - `accentColor`: hex color `#RRGGBB`
  - `style`: `card` | `square`
  - `className`: extra CSS class
  - `playSound`, `soundFile`, `volume` (0.0–1.0)
  - `title`: optional title text — zobrazené nad správou (správa je menším písmom)

Progress
--------
- Bar options: `position`, `minimal`, `compact`, `showCountdown` (alias: `showPercent`), `accentColor`, `className`
- Circle options: `position`, `size`, `thickness`, `showCountdown` (alias: `showPercent`), `accentColor`, `className`

Menu (Unified)
--------------
Use a single export: `Menu(payload)`. `kind` decides which UI opens.

```
-- Select
local sel = exports['evo-lib']:Menu({
  kind = 'select', title = 'Choose Option', canClose = true,
  options = {
    { id = 'a', label = 'Alpha', description = 'First option', icon = 'fa-solid fa-a' },
    { id = 'b', label = 'Beta',  description = 'Second option', icon = 'fa-solid fa-b', disabled = true },
  }
})
```

Category (with live update)
---------------------------
```
exports['evo-lib']:Menu({ kind = 'category', title = 'Jobs', categories = {
  { id = 'ems', label = 'EMS', description = 'Medical Services', icon = 'fa-solid fa-kit-medical',
    stats = { { label = 'Level', value = 3 }, { label = 'XP', value = '20/100' } },
    progress = { value = 20, max = 100 },
    items = { { id = 'apply', label = 'Apply' }, { id = 'info', label = 'Info' } }
  }
}})

-- Later update while open
exports['evo-lib']:MenuUpdateCategory('ems', { progress = { value = 60, max = 100 }, stats = { { label='XP', value='60/100' } } })
```

Context Menus (ID‑based)
------------------------
Register once, show by id, supports nesting (`menu`), handlers (`onSelect`, `event`, `serverEvent`), `disabled`, `readOnly`, `canClose`, `onExit`, `onBack`.

```
exports['evo-lib']:RegisterContext({
  id = 'example_menu', title = 'Example Menu', canClose = true,
  options = {
    { title = 'Say hello', icon = 'fa-solid fa-hand', event = 'chat:addMessage', args = { args = { '^2Hello!' } } },
    { title = 'Server ping', serverEvent = 'myres:serverPing', args = { time = GetGameTimer() } },
    { title = 'Submenu →', menu = 'submenu' },
  }
})

exports['evo-lib']:RegisterContext({
  id = 'submenu', title = 'Submenu', canClose = true,
  options = {
    { title = 'Option A', onSelect = function(a) print('A', a and a.foo) end, args = { foo = 1 } },
    { title = 'Option B (disabled)', disabled = true },
  }
})

exports['evo-lib']:ShowContext('example_menu')   -- open
exports['evo-lib']:HideContext(true)             -- close (fires onExit)
local openId = exports['evo-lib']:GetOpenContextMenu()
```

Events
------
- Client: `EvoLib:Notify`, `EvoLib:ProgressBar`, `EvoLib:ProgressCircle`, `EvoLib:MenuUpdateCategory`, `EvoLib:RegisterContext`, `EvoLib:ShowContext`, `EvoLib:HideContext`, `EvoLib:Theme`
- Server: `exports['evo-lib']:Menu(playerId, payload, cb)` receives `cb(result | nil)`

Config (`config.lua`)
---------------------
- Theme
  - `Config.Theme.BrandTheme` — apply brand accent globally
  - `Config.Theme.AccentColor` — hex color (supports `AARRGGBB`, alpha ignored)
  - `Config.Theme.BrandNotify` — if true, notifications use brand accent by default
- Notify
  - `Position`, `DefaultDuration`, `MaxShown`, `Style`, `Sound = { Enabled, File, Volume }`
- Progress
  - Bar: `DefaultPosition`, `Minimal`, `Compact`, `ShowCountdown`
  - Circle: `DefaultPosition`, `Size`, `Thickness`, `ShowCountdown`

Advanced: Theme Overrides
-------------------------
- Change CSS variables at runtime:
```
exports['evo-lib']:Theme({ accent = '#ff970e' })  -- sets --accent
```

Notes
-----
- Server‑side `Menu` has a 60s timeout and calls the callback with `nil` on timeout.
- Client‑side `Menu` blocks until the user chooses or cancels.
- `HideContext()` by default triggers `onExit` (pass `false` to skip).
