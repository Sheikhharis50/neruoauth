import { IDENTITY_SERVER_URL } from "../config/constants";

export const register = async ({
    loginHash,
    publicKey,
    encryptedPrivateKey,
    encryptedPrivateKeyIV,
    encryptedPrivateKeyTag,
    encSalt
}) => {
    try {
        const res = await fetch(`${IDENTITY_SERVER_URL}/auth/register/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pass_phrase: loginHash,
                public_key: publicKey,
                encrypted_private_key: encryptedPrivateKey,
                encrypted_private_key_iv: encryptedPrivateKeyIV,
                encrypted_private_key_tag: encryptedPrivateKeyTag,
                enc_salt: encSalt
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error("Error during registration:", err);
        throw err;
    }
};