Place your notification sound file here and match the config path.

Default expected path from config:
- sfx/notify.ogg

Supported: .ogg or .mp3 (recommend .ogg). Example steps:
1) Put your file at: html/sfx/notify.ogg
2) In config.lua set:
   Config.Notify.Sound = {
     Enabled = true,
     File = 'sfx/notify.ogg',
     Volume = 0.6,
   }
3) restart evo-lib

