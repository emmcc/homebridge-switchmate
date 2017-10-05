var Switchmate3Device = require('node-switchmate3').Switchmate3Device;
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Switchmate3Manager = function ()
{
    var manager = this;
    manager.initialized = false;
    manager.SmIdList = [];
    manager.event = new EventEmitter();
    manager.Switchmate3s = [];
    if (!(this instanceof Switchmate3Manager))
        return new Switchmate3Manager();


    manager.FindAllSwitchmate3s = function ()
    {
        Switchmate3Device.SCAN_DUPLICATES = true;
        Switchmate3Device.discoverAll(onFound);
    };

    manager.StopFind = function ()
    {
        Switchmate3Device.stopDiscoverAll(onFound);
    };

    manager.ResetSwitchmate3Scan = function()
    {
            manager.StopFind();
            manager.FindAllSwitchmate3s();
    };

    function onFound(foundSm) {
        var smid = foundSm.id;

        if (smid in manager.SmIdList) //if Switchmate3 is in the list of configured Switchmate3 ids.
        {
            if (!manager.SmIdList[smid] === true) //if Switchmate3 hasn't been found until now...
            {
                var foundSmToggleMode = foundSm.ToggleMode();
                foundSm.on('unreachable', function (smid) {
                    manager.event.emit('smUnreachable', smid);
                });
                foundSm.on('reachable', function (smid) {
                    manager.event.emit('smReachable', smid);
                });
                foundSmToggleMode.event.on('toggleDone',manager.ResetSwitchmate3Scan);
                foundSm.foundMe();
                manager.Switchmate3s[smid] = foundSm;
                manager.SmIdList[smid] = true;
                manager.event.emit('smSetup', smid);
            } else
            {
                if (manager.Switchmate3s[smid].ToggleState !== foundSm.ToggleState && foundSm.ToggleState !== null)
                {
                    manager.Switchmate3s[smid].ToggleState = foundSm.ToggleState;
                    manager.event.emit('smToggleStateChange', smid, foundSm.ToggleState);
                }
                manager.Switchmate3s[smid].foundMe();
            }
        }
    }
};

Switchmate3Manager.prototype.Initialize = function (sm_config)
{
    var manager = this;
    if (!manager.initialized)
    {
        manager.SmRaw = sm_config;
        for (var i = 0, len = manager.SmRaw.length; i < len; i++) {
            sminfo = manager.SmRaw[i];
            manager.SmIdList[sminfo.id] = false;
        }
        manager.FindAllSwitchmate3s();
        manager.initialized = true;
    }
};

Switchmate3Manager.prototype.GetSwitchmate3State = function (smid)
{
    manager = this;
    if (typeof manager.Switchmate3s[smid] !== 'undefined')
    {
        return manager.Switchmate3s[smid].ToggleState; //if Switchmate3 exists, return its last known Toggle State.
    } else
    {
        return false;  //otherwise, just assume it is turned off.
    }
};

Switchmate3Manager.prototype.GetReachableState = function (smid)
{
    if (this.SmIdList[smid] === false || typeof this.SmIdList[smid] === 'undefined')
    {
        return false;
    } else
    {
        return this.Switchmate3s[smid].Reachable;
    }
};

Switchmate3Manager.prototype.On = function (smid)
{
    var manager = this;
    if (manager.SmIdList[smid] === true &&
        (manager.Switchmate3s[smid].ToggleState === false || manager.Switchmate3s[smid].ToggleState === null))
    {
        var ToggleMode = manager.Switchmate3s[smid].ToggleMode();
        //ToggleMode.event.on('toggleDone', restartScan);
        ToggleMode.TurnOn();
    }
};

Switchmate3Manager.prototype.Off = function (smid)
{
    var manager = this;
    if (manager.SmIdList[smid] === true && (
        manager.Switchmate3s[smid].ToggleState === true || manager.Switchmate3s[smid].ToggleState === null))
    {
        var ToggleMode = manager.Switchmate3s[smid].ToggleMode();
        ToggleMode.TurnOff();
    }
};

Switchmate3Manager.prototype.Identify = function (smid)
{
    var manager = this;
    if (manager.SmIdList[smid] === true)
    {
        var ToggleMode = manager.Switchmate3s[smid].ToggleMode();
        ToggleMode.IdentifySwitchmate3();
    }
};

util.inherits(Switchmate3Manager, EventEmitter);
module.exports = Switchmate3Manager;
