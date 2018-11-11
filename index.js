"use strict";
var Switchmate3Manager = require('./Switchmate3Manager');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-switchmate3", "Switchmate3", Switchmate3Platform);
};

function Switchmate3Platform(log, config, api) {
    this.log = log;
    this.config = config;
    this.switchmate3s = this.config.switchmate3s || [];
    this.accessories = [];
    this.SmManager = new Switchmate3Manager();

    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}

Switchmate3Platform.prototype.configureAccessory = function (accessory) {
    var accessoryId = accessory.context.id;

    this.setService(accessory);
    this.accessories[accessoryId] = accessory;
};

Switchmate3Platform.prototype.didFinishLaunching = function () {
    var platform = this;
    if (!this.switchmate3s.length) {
        platform.log.error("No Switchmate3s configured. Please check your 'config.json' file!");
    } else
    {
        for (var i in platform.switchmate3s) {
            var data = platform.switchmate3s[i];
            data.name = "Switchmate3 " + data.id.substring(data.id.length - 6);
            platform.log("Adding " + data.name + ": (" + data.displayName + ")");
            platform.addAccessory(data);
        }

        for (var id in platform.accessories) {
            var switchmate3 = platform.accessories[id];
            if (!switchmate3.reachable) {
                platform.removeAccessory(switchmate3);
            }
        }
        platform.SmManager.event.on('smSetup', function (smid) {
            var mySwitchmate3 = platform.accessories[smid];
            mySwitchmate3.getService(Service.Switch)
                    .getCharacteristic(Characteristic.On).getValue();
        });
        platform.SmManager.event.on('smToggleStateChange', function (smid, state)
        {
            var mySwitchmate3 = platform.accessories[smid];
            mySwitchmate3.getService(Service.Switch)
                    .getCharacteristic(Characteristic.On).getValue();
        });
        platform.SmManager.event.on('smBatteryLevelChange', function (smid, state)
        {
            var mySwitchmate3 = platform.accessories[smid];
            mySwitchmate3.getService(Service.BatteryService)
                    .getCharacteristic(Characteristic.BatteryLevel).getValue();
            mySwitchmate3.getService(Service.BatteryService)
                    .getCharacteristic(Characteristic.StatusLowBattery).getValue();
        });
        platform.SmManager.Initialize(platform.switchmate3s);
    }
};

Switchmate3Platform.prototype.addAccessory = function (data) {
    if (!this.accessories[data.id]) {
        var uuid = UUIDGen.generate(data.id);

        var newAccessory = new Accessory(data.id, uuid, 8);

        newAccessory.reachable = true;
        newAccessory.context.name = "Switchmate3 " + data.id.substring(data.id.length - 6);
        newAccessory.context.displayName = data.displayName;
        newAccessory.context.id = data.id;

        newAccessory.addService(Service.Switch, data.displayName);

        this.setService(newAccessory);

        this.api.registerPlatformAccessories("homebridge-switchmate3", "Switchmate3", [newAccessory]);
    } else {
        var newAccessory = this.accessories[data.id];

        newAccessory.updateReachability(true);
    }

    this.getInitState(newAccessory, data);

    this.accessories[data.id] = newAccessory;
};

Switchmate3Platform.prototype.removeAccessory = function (accessory) {
    if (accessory) {
        var name = accessory.context.name;
        var id = accessory.context.id;
        this.log.warn("Removing Switchmate3: " + name + ". No longer configured.");
        this.api.unregisterPlatformAccessories("homebridge-switchmate3", "Switchmate3", [accessory]);
        delete this.accessories[id];
    }
};

Switchmate3Platform.prototype.setService = function (accessory) {
    accessory.getService(Service.Switch)
            .getCharacteristic(Characteristic.On)
            .on('set', this.setToggleState.bind(this, accessory.context))
            .on('get', this.getToggleState.bind(this, accessory.context));

    accessory.on('identify', this.identify.bind(this, accessory.context));

    if ( !accessory.getService(Service.BatteryService) ) {
        accessory.addService(Service.BatteryService);
    }

    accessory.getService(Service.BatteryService)
            .getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this.getBatteryLevel.bind(this, accessory.context));

    accessory.getService(Service.BatteryService)
            .getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', this.getBatteryIsLow.bind(this, accessory.context));
};

Switchmate3Platform.prototype.getInitState = function (accessory, data) {
    var info = accessory.getService(Service.AccessoryInformation);

    accessory.context.manufacturer = "Switchmate3";
    info.setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer);

    accessory.context.model = data.model || "";
    info.setCharacteristic(Characteristic.Model, accessory.context.model);

    accessory.context.lowBatteryPercent = data.lowBatteryPercent || 25;

    info.setCharacteristic(Characteristic.SerialNumber, accessory.context.id);

    accessory.getService(Service.Switch)
            .getCharacteristic(Characteristic.On)
            .getValue();

    accessory.getService(Service.BatteryService)
            .getCharacteristic(Characteristic.BatteryLevel)
            .getValue();

    accessory.getService(Service.BatteryService)
            .getCharacteristic(Characteristic.StatusLowBattery)
            .getValue();
};

Switchmate3Platform.prototype.setToggleState = function (mySwitchmate3, powerState, callback) {
    var platform = this;
    platform.log("Setting %s (%s) to: %s", mySwitchmate3.displayName, mySwitchmate3.name, (powerState ? "ON" : "OFF"));
    powerState ? platform.SmManager.On(mySwitchmate3.id) : platform.SmManager.Off(mySwitchmate3.id);
    callback();
};

Switchmate3Platform.prototype.getToggleState = function (mySwitchmate3, callback) {
    var platform = this;
    var status = platform.SmManager.GetSwitchmate3State(mySwitchmate3.id);
    platform.log("Status of %s (%s) is: %s", mySwitchmate3.displayName, mySwitchmate3.name, (status ? "ON" : "OFF"));
    callback(null, status);

};

Switchmate3Platform.prototype.identify = function (mySwitchmate3, paired, callback) {
    var platform = this;
    platform.log("Identify requested for " + mySwitchmate3.name);
    callback();
};

Switchmate3Platform.prototype.getBatteryLevel = function (mySwitchmate3, callback) {
    var platform = this;
    var battery = platform.SmManager.GetSwitchmate3BatteryLevel(mySwitchmate3.id);
    platform.log("Battery Level of %s (%s) is: %s%", mySwitchmate3.displayName, mySwitchmate3.name, battery);
    callback(null, battery);
};

Switchmate3Platform.prototype.getBatteryIsLow = function (mySwitchmate3, callback) {
    var platform = this;
    var isLowBattery = platform.SmManager.GetSwitchmate3BatteryLevel(mySwitchmate3.id) <= parseInt(mySwitchmate3.lowBatteryPercent);
    callback(null, isLowBattery);
};
