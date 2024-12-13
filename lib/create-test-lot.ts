// # create-test-lot.ts
import path from 'node:path';
import { LTEXT } from 'sc4/core';
import { LotObject } from 'sc4/core';
import { FileType } from 'sc4/core';
import {
	DBPF,
	Exemplar,
	ExemplarProperty as Property,
} from 'sc4/core';
import { randomId } from 'sc4/utils';


let lot = new DBPF();
let iid = randomId();
let name = '000000_test_lot';

// Generate the essential properties for the building exemplar and then add the 
// building exemplar to the DBPF.
let building = new Exemplar();
building.parent = [0x05342861, 0x07bddf1c, 0x00000002];
building.addProperty('ExemplarType', Property.ExemplarType.Buildings);
building.addProperty('ExemplarName', name);
building.addProperty('BulldozeCost', 0n);
building.addProperty('OccupantSize', [20, 0, 20]);
building.addProperty('FillingDegree', 0.5);
building.addProperty('ResourceKeyType0', [0, 0, 0]);
building.addProperty('Wealth', Property.Wealth.HighWealth);
building.addProperty('PluginPackID', iid);
building.addProperty('ItemOrder', -2147483647);
building.addProperty('ItemDescription', 'Test lot');
building.addProperty('OccupantGroups', [
	Property.OccupantGroups.BuildingCivic,
	Property.OccupantGroups.BuildingPark,
]);
building.addProperty('UserVisibleNameKey', [FileType.LTEXT, 0x6a386d26, iid]);
building.addProperty('CraneHints', Property.CraneHints.NoCrane);
building.addProperty('WaterConsumed', 0);
building.addProperty('PowerConsumed', 0);
building.addProperty('LotResourceKey', iid);
building.addProperty('BudgetItemDepartment', [Property.BudgetItemDepartment.ParkAndRec]);
building.addProperty('BudgetItemCost', [0n]);
lot.add([FileType.Exemplar, 0x07bddf1c, iid], building);

// Generate the lot configurations exemplar.
let config = new Exemplar();
config.addProperty('ExemplarType', Property.ExemplarType.LotConfigurations);
config.addProperty('ExemplarName', name);
config.addProperty('LotConfigPropertySize', [20, 20]);
config.addProperty('LotConfigPropertyVersion', 2);
config.addProperty('LotConfigPropertyMaxSlopeBeforeLotFoundation', 54);
config.addProperty('LotConfigPropertyMaxSlopeAllowed', 24);
config.addProperty('LotConfigPropertyPurposeTypes', [Property.LotConfigPropertyPurposeTypes.None]);
config.addProperty('LotConfigPropertyZoneTypes', [Property.LotConfigPropertyZoneTypes.PloppedBuilding]);
config.addProperty('LotConfigPropertyWealthTypes', [Property.LotConfigPropertyWealthTypes.None]);
config.addProperty('LotConfigPropertyRetainingWallTypes', [0xC96D2135]);
config.addProperty('BuildingFoundation', 0x890B7314);
config.addProperty('CustomLot', 1);
config.lotObjects.push(
	new LotObject({
		type: LotObject.Building,
		x: 8,
		z: 8,
		IID: iid,
	}),
);
lot.add([FileType.Exemplar, 0xa8fbd372, iid], config);

// Add an LTEXT to make the item properly appear.
let desc = new LTEXT('Hello, this is a test lot');
lot.add([FileType.LTEXT, 0x6a386d26, iid], desc);

// Save the dbpf.
lot.save(
	path.join(process.env.SC4_PLUGINS, 'test_lot.SC4Lot'),
);
