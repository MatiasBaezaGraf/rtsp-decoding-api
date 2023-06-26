const crypto = require("crypto");

// Encryption function. GOES IN THE CLIENT
const encrypt = (text, key, iv) => {
	//const iv = crypto.randomBytes(16);

	const keyToUse = crypto
		.createHash("sha256")
		.update(String(key))
		.digest("base64")
		.slice(0, 32);
	const cipher = crypto.createCipheriv(
		"aes-256-cbc",
		keyToUse,
		Buffer.from(iv, "hex")
	);
	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");

	return encrypted;
};

// Decryption function
const decrypt = (encryptedText, key, iv) => {
	const keyToUse = crypto
		.createHash("sha256")
		.update(String(key))
		.digest("base64")
		.slice(0, 32);
	try {
		const decipher = crypto.createDecipheriv(
			"aes-256-cbc",
			keyToUse,
			Buffer.from(iv, "hex")
		);
		let decrypted = decipher.update(encryptedText, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	} catch (err) {
		console.log("Check API Key! Possible cascade failure!");
	}
};

const hashString = (string) => {
	const hash = crypto.createHash("sha256");
	hash.update(string);
	const hashedString = hash.digest("hex");
	return hashedString;
};

module.exports = { encrypt, decrypt, hashString };
