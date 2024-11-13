// # scrape-test.js
import { expect } from 'chai';
import { getAssetSuffix } from '../lib/scrape.js';

describe('#getAssetSuffix()', function() {

	before(function() {
		Object.defineProperty(this, 'suffix', {
			get() {
				return getAssetSuffix(this.test.title, 1);
			},
		});
	});

	it('Install NYBT Gracie Manor (Maxis Nite).zip', function() {
		expect(this.suffix).to.equal('maxisnite');
	});

	it('Install NYBT Gracie Manor (Dark Nite).zip', function() {
		expect(this.suffix).to.equal('darknite');
	});

	it('Install NYBT Gracie Manor (maxisnite).zip', function() {
		expect(this.suffix).to.equal('maxisnite');
	});

	it('Install NYBT Gracie Manor (darknite).zip', function() {
		expect(this.suffix).to.equal('darknite');
	});

	it('DiegoDLL_EdificioAlas_HD_MN.zip', function() {
		expect(this.suffix).to.equal('maxisnite');
	});

	it('DiegoDLL_EdificioAlas_HD_DN.zip', function() {
		expect(this.suffix).to.equal('darknite');
	});

	it('hadnot.zip', function() {
		expect(this.suffix).to.equal('part-1');
	});

});
