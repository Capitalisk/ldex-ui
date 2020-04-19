const formatThousands = function (num, separator) {
	separator = separator || ',';
	let numParts = [];
	let paddingZero = '0';

	let fractionDecimals = num.toString().split('.')[1] || '';
	if (fractionDecimals.length) {
		fractionDecimals = '.' + fractionDecimals;
	}
	let remaining = Math.floor(num);
	if (remaining === 0) {
		return remaining + fractionDecimals;
	}

	let lastDigits;
	while (remaining !== 0) {
		lastDigits = (remaining % 1000).toString();
		remaining = Math.floor(remaining / 1000);
		if (remaining !== 0) {
			lastDigits =  lastDigits + paddingZero.repeat(3 - lastDigits.length);
		}
		numParts.push(lastDigits);
	}
	return numParts.reverse().join(separator) + fractionDecimals;
}

export default formatThousands;