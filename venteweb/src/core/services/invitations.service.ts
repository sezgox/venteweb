import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class InvitationsService {

    constructor(private readonly jwtService: JwtService){}

    private readonly ENCRYPTION_KEY = process.env.EVENT_ENCRYPTION_KEY || 'change_this_secret_key';
    private readonly IV_LENGTH = 16;


    generateMasterKey(): string {
        console.log(this.ENCRYPTION_KEY)
        return crypto.randomBytes(32).toString('hex');
    }

    encryptMasterKey(masterKey: string): string {
        const iv = crypto.randomBytes(this.IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.ENCRYPTION_KEY, 'utf8').subarray(0, 32), iv,);
        let encrypted = cipher.update(masterKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    decryptMasterKey(encrypted: string): string {
        if (!encrypted) return null;
        const [ivHex, encryptedKey] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.ENCRYPTION_KEY, 'utf8').subarray(0, 32), iv,);
        let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    async generateInvitation(eventId: string, organizer: string, masterKey: string, invitedUser?: string) {
        const jwtConfig = {
            secret: masterKey,
            expiresIn: process.env.EVENT_INVITATION_EXPIRES_IN,
            issuer: organizer,
        } as JwtSignOptions;
        const payload = { eventId,  organizer, invitedUser };
            return await this.jwtService.signAsync(payload, jwtConfig);
    }

    // Verifica una invitación usando la clave maestra
    async verifyInvitation(token: string, masterKey: string, invitedUser?: string) {
        try {
            const payload = await this.jwtService.verifyAsync(token, {secret: masterKey,});
            if(payload.invitedUser && payload.invitedUser !== invitedUser) return false;
            return true;
        } catch (err) {
            console.error('Invalid invitation token');
            return false;
        }
    }

}
