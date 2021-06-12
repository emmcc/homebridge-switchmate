# A Homebridge plugin for Switchmate3 #

Notice: I haven't used this plugin for a long time. I now use Samsung Smartthings hub + Ecolink ZWAVE switch.
Similar to Swtichmate, it allows conventional light switches to be remotely controlled, but it's much more stable.
One tip: Ecolink ZWAVE switch can't operate with NiMH rechargeable battery due to their low operating voltage.
I recommend rechargeable lithium AA batteries, which can maintain a stable 5V supply.

Switchmate is a BLE controlled light switch add-on that provide smart home capability to conventional light switches.

This plugin is developed for a specific model of Switchmate switch TSM003W. This is the newer toggle style Switchmate
which have a smaller form factor for fitting on a multi-gang switch.

This plugin is a fork of [homebridge-switchmate](https://github.com/emmcc/homebridge-switchmate) a Homebridge Plugin
for the original Switchmate (RSM0001 & RSM0002). As the communication protocol of these two product is quite different.
I have to use [node-switchmate3](https://github.com/valkjsaaa/node-switchmate3) as the communication library. Any
attempt to merge them would be welcome :)

This plugin is still very experimental. Please create an issue or a pull request for any problem you encountered.
