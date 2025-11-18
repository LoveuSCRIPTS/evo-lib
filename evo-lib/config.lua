Config = {}

-- Theme (applies to notifications and progress UI)
Config.Theme = {
    BrandTheme = true,
    -- Accepts '#RRGGBB', 'RRGGBB', or 'AARRGGBB' (alpha ignored)
    AccentColor = 'FFFFFFFF',
    -- If true AND BrandTheme is true, notifications use brand AccentColor
    BrandNotify = false
}

-- Notifications
Config.Notify = {
    -- 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
    Position = 'top-right',
    DefaultDuration = 4000,
    MaxShown = 5,
    -- 'card' | 'square'
    Style = 'card',
    -- Sound settings for notifications (single sound for all types)
    Sound = {
        Enabled = true,           -- enable sound by default
        File = 'sfx/notify.ogg',  -- path relative to html/ (place file at html/sfx/notify.ogg)
        Volume = 0.4              -- 0.0 – 1.0
    }
}

-- Progress UI defaults
Config.Progress = {
    Bar = {
        DefaultPosition = 'bottom-center',
        Minimal = true,
        Compact = false,
        Easing = {
            Start = 1,
            EndSlope = 0.10
        }
    },
    Circle = {
        DefaultPosition = 'bottom-center',
        Size = 120,
        Thickness = 7,
        -- Show countdown seconds text inside circle
        ShowCountdown = true
    }
}

