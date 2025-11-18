fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'evo-lib'
author 'lovu'
version '1.0.0'
description 'Evo-lib: Notifications, Progress UI, and Unified Menu for FiveM/QBCore'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'html/custom.css',
    'html/sfx/*'
}

client_scripts {
    'config.lua',
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

exports {
    'Notify',
    'ProgressBar',
    'ProgressCircle',
    'Menu',
    'MenuUpdateCategory',
    'RegisterContext',
    'ShowContext',
    'HideContext',
    'GetOpenContextMenu',
    'Theme'
}

server_exports {
    'Notify',
    'ProgressBar',
    'ProgressCircle',
    'Menu'
}
