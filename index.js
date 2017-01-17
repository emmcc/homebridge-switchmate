"use strict";
var SwitchmateManager = require('./SwitchmateManager');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-switchmate", "Switchmate", SwitchmatePlatform);
};

function SwitchmatePlatform(log, config, api) {
    this.log = log;
    this.config = config;
    this.switchmates = this.config.switchmates || [];
    this.accessories = [];
    this.SmManager = new SwitchmateManager();

    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}
;

SwitchmatePlatform.prototype.configureAccessory = function (accessory) {
    var accessoryId = accessory.context.id;

    this.setService(accessory);
    this.accessories[accessoryId] = accessory;
};

SwitchmatePlatform.prototype.didFinishLaunching = function () {
    var platform = this;
    if (!this.switchmates.length) {
        platform.log.error("No Switchmates configured. Please check your 'config.json' file!");
    } else
    {
        for (var i in platform.switchmates) {
            var data = platform.switchmates[i];
            data.name = "Switchmate " + data.id.substring(data.id.length - 6);
            platform.log("Adding " + data.name + ": (" + data.displayName + ")");
            platform.addAccessory(data);
        }

        for (var id in platform.accessories) {
            var switchmate = platform.accessories[id];
            if (!switchmate.reachable) {
                platform.removeAccessory(switchmate);
            }
        }
        platform.SmManager.event.on('smSetup', function (smid) {
            var mySwitchmate = platform.accessories[smid];
            mySwitchmate.getService(Service.Switch)
                    .getCharacteristic(Characteristic.On).getValue();
        });
        platform.SmManager.event.on('smToggleStateChange', function (smid, state)
        {
            var mySwitchmate = platform.accessories[smid];
            mySwitchmate.getService(Service.Switch)
                    .getCharacteristic(Characteristic.On).getValue();
        });
        platform.SmManager.Initialize(platform.switchmates);
    }
};

SwitchmatePlatform.prototype.addAccessory = function (data) {
    if (!this.accessories[data.id]) {
        var uuid = UUIDGen.generate(data.id);

        var newAccessory = new Accessory(data.id, uuid, 8);

        newAccessory.reachable = true;
        newAccessory.context.name = "Switchmate " + data.id.substring(data.id.length - 6);
        newAccessory.context.displayName = data.displayName;
        newAccessory.context.id = data.id;

        newAccessory.addService(Service.Switch, data.displayName);

        this.setService(newAccessory);

        this.api.registerPlatformAccessories("homebridge-switchmate", "Switchmate", [newAccessory]);
    } else {
        var newAccessory = this.accessories[data.id];

        newAccessory.updateReachability(true);
    }

    this.getInitState(newAccessory, data);

    this.accessories[data.id] = newAccessory;
};

SwitchmatePlatform.prototype.removeAccessory = function (accessory) {
    if (accessory) {
        var name = accessory.context.name;
        var id = accessory.context.id;
        this.log.warn("Removing Switchmate: " + name + ". No longer configured.");
        this.api.unregisterPlatformAccessories("homebridge-switchmate", "Switchmate", [accessory]);
        delete this.accessories[id];
    }
};

SwitchmatePlatform.prototype.setService = function (accessory) {
    accessory.getService(Service.Switch)
            .getCharacteristic(Characteristic.On)
            .on('set', this.setToggleState.bind(this, accessory.context))
            .on('get', this.getToggleState.bind(this, accessory.context));

    accessory.on('identify', this.identify.bind(this, accessory.context));
};

SwitchmatePlatform.prototype.getInitState = function (accessory, data) {
    var info = accessory.getService(Service.AccessoryInformation);

    accessory.context.manufacturer = "Switchmate";
    info.setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer);

    accessory.context.model = data.model || "";
    info.setCharacteristic(Characteristic.Model, accessory.context.model);

    info.setCharacteristic(Characteristic.SerialNumber, accessory.context.id);

    accessory.getService(Service.Switch)
            .getCharacteristic(Characteristic.On)
            .getValue();
};

SwitchmatePlatform.prototype.setToggleState = function (mySwitchmate, powerState, callback) {

    var platform = this;
    platform.log("Setting %s (%s) to: %s", mySwitchmate.displayName, mySwitchmate.name, (powerState ? "ON" : "OFF"));
    powerState ? platform.SmManager.On(mySwitchmate.id) : platform.SmManager.Off(mySwitchmate.id);
    callback();
};

SwitchmatePlatform.prototype.getToggleState = function (mySwitchmate, callback) {
    var platform = this;
    var status = platform.SmManager.GetSwitchmateState(mySwitchmate.id);
    platform.log("Status of %s (%s) is: %s", mySwitchmate.displayName, mySwitchmate.name, (status ? "ON" : "OFF"));
    callback(null, status);

};

SwitchmatePlatform.prototype.identify = function (mySwitchmate, paired, callback) {
    var platform = this;
    platform.log("Identify requested for " + mySwitchmate.name);
    callback();
};