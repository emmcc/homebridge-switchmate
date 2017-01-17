var SwitchmateDevice = require('node-switchmate').SwitchmateDevice;
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var SwitchmateManager = function ()
{
    var manager = this;
    manager.initialized = false;
    manager.SmIdList = [];
    manager.SmAuthList = [];
    manager.event = new EventEmitter();
    manager.Switchmates = [];
    if (!(this instanceof SwitchmateManager))
        return new SwitchmateManager();


    manager.FindAllSwitchmates = function ()
    {
        SwitchmateDevice.SCAN_DUPLICATES = true;
        SwitchmateDevice.discoverAll(onFound);
    };

    manager.StopFind = function ()
    {
        SwitchmateDevice.stopDiscoverAll(onFound);
    };
    
    manager.ResetSwitchmateScan = function()
    {
            manager.StopFind();
            manager.FindAllSwitchmates();
    };

    function onFound(foundSm) {
        var smid = foundSm.id;

        if (smid in manager.SmIdList) //if switchmate is in the list of configured switchmate ids.
        {
            if (!manager.SmIdList[smid] === true) //if switchmate hasn't been found until now...
            {
                if (typeof manager.SmAuthList[smid] !== 'undefined') { //if an auth code exists, set it up!
                    foundSm.setAuthCode(manager.SmAuthList[smid]);
                }
                var foundSmToggleMode = foundSm.ToggleMode();
                foundSm.on('unreachable', function (smid) {
                    manager.event.emit('smUnreachable', smid);
                });
                foundSm.on('reachable', function (smid) {
                    manager.event.emit('smReachable', smid);
                });
                foundSmToggleMode.event.on('toggleDone',manager.ResetSwitchmateScan);
                foundSm.foundMe();
                manager.Switchmates[smid] = foundSm;
                manager.SmIdList[smid] = true;
                manager.event.emit('smSetup', smid);
            } else
            {
                if (manager.Switchmates[smid].ToggleState !== foundSm.ToggleState && foundSm.ToggleState !== null)
                {
                    manager.Switchmates[smid].ToggleState = foundSm.ToggleState;
                    manager.event.emit('smToggleStateChange', smid, foundSm.ToggleState);
                }
                manager.Switchmates[smid].foundMe();
            }
        }
    }
};

SwitchmateManager.prototype.Initialize = function (sm_config)
{
    var manager = this;
    if (!manager.initialized)
    {
        manager.SmRaw = sm_config;
        for (var i = 0, len = manager.SmRaw.length; i < len; i++) {
            sminfo = manager.SmRaw[i];
            manager.SmIdList[sminfo.id] = false;
            manager.SmAuthList[sminfo.id] = sminfo.authCode;
        }
        manager.FindAllSwitchmates();
        manager.initialized = true;
    }
};

SwitchmateManager.prototype.GetSwitchmateState = function (smid)
{
    manager = this;
    if (typeof manager.Switchmates[smid] !== 'undefined')
    {
        return manager.Switchmates[smid].ToggleState; //if switchmate exists, return its last known Toggle State.
    } else
    {
        return false;  //otherwise, just assume it is turned off.   
    }
};

SwitchmateManager.prototype.GetReachableState = function (smid)
{
    if (this.SmIdList[smid] === false || typeof this.SmIdList[smid] === 'undefined')
    {
        return false;
    } else
    {
        return this.Switchmates[smid].Reachable;
    }
};

SwitchmateManager.prototype.On = function (smid)
{
    manager = this;
    if (manager.SmIdList[smid] === true && manager.Switchmates[smid].ToggleState === false)
    {
        var ToggleMode = manager.Switchmates[smid].ToggleMode();
        //ToggleMode.event.on('toggleDone', restartScan);
        
        ToggleMode.TurnOn();
    }
};

SwitchmateManager.prototype.Off = function (smid)
{
    manager = this;
    if (manager.SmIdList[smid] === true && manager.Switchmates[smid].ToggleState === true)
    {
        ToggleMode = manager.Switchmates[smid].ToggleMode();
        ToggleMode.TurnOff();
    }
};

SwitchmateManager.prototype.Identify = function (smid)
{
    manager = this;
    if (manager.SmIdList[smid] === true)
    {
        ToggleMode = manager.Switchmates[smid].ToggleMode();
        ToggleMode.IdentifySwitchmate();
    }
};

util.inherits(SwitchmateManager, EventEmitter);
module.exports = SwitchmateManager;