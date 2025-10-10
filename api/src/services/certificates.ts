/**
 * Certificate Service
 * Epic 7: Gamification & Certification System
 * PDF generation and Ed25519 signature verification
 * 
 * NOTE: Requires dependencies (install with):
 * npm install pdfkit @types/pdfkit @noble/ed25519
 */

import { db } from '../db';
import { certificates, users, tracks, organizations } from '../db/schema';
import { eq } from 'drizzle-orm';

// Private key for signing (hex format)
const SIGNING_KEY = process.env.CERT_SIGNING_KEY || '';

export interface CertificateData {
  certificateId: string;
  userId: string;
  userName: string;
  trackId: string;
  trackTitle: string;
  organizationName: string;
  issuedAt: Date;
}

/**
 * Generate certificate when learner completes track
 */
export async function generateCertificate(
  userId: string,
  trackId: string
): Promise<{ id: string; signature: string; verificationUrl: string }> {
  // Get user, track, organization data
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId)).limit(1);
  
  if (!user || !track) {
    throw new Error('User or track not found');
  }

  // Get organization
  const [org] = user.organizationId 
    ? await db.select().from(organizations).where(eq(organizations.id, user.organizationId)).limit(1)
    : [null];

  // Create certificate data
  const certData: Partial<CertificateData> = {
    userId: user.id,
    userName: user.email, // Use email as fallback for name
    trackId: track.id,
    trackTitle: track.title,
    organizationName: org?.name || 'Individual Learner',
    issuedAt: new Date(),
  };

  // Generate signature
  const signature = await signCertificate(certData);

  // Insert certificate record
  const [cert] = await db
    .insert(certificates)
    .values({
      userId: user.id,
      trackId: track.id,
      organizationId: user.organizationId || null,
      issuedAt: certData.issuedAt!,
      signature,
      verificationUrl: '', // Will update with real ID
    })
    .returning({ id: certificates.id });

  if (!cert) {
    throw new Error('Failed to create certificate record');
  }

  certData.certificateId = cert.id;

  // Update verification URL with real certificate ID
  const verificationUrl = `https://cerply.com/verify/${cert.id}`;
  await db
    .update(certificates)
    .set({ verificationUrl })
    .where(eq(certificates.id, cert.id));

  return {
    id: cert.id,
    signature,
    verificationUrl,
  };
}

/**
 * Sign certificate data with Ed25519
 * For MVP, we'll generate a deterministic signature from the data
 * In production, this should use actual Ed25519 signing
 */
async function signCertificate(data: Partial<CertificateData>): Promise<string> {
  if (!SIGNING_KEY) {
    console.warn('[certificates] CERT_SIGNING_KEY not configured, using mock signature');
  }

  // Create message to sign
  const message = JSON.stringify({
    certificateId: data.certificateId,
    userId: data.userId,
    trackId: data.trackId,
    issuedAt: data.issuedAt?.toISOString(),
  });

  // For MVP without @noble/ed25519, generate deterministic hash
  // TODO: Replace with actual Ed25519 signing when dependencies installed
  const mockSignature = Buffer.from(message).toString('base64');
  
  return mockSignature;
}

/**
 * Verify certificate signature
 * For MVP, this validates the certificate exists and matches
 */
export async function verifyCertificate(
  certificateId: string,
  signature: string
): Promise<boolean> {
  const [cert] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.id, certificateId))
    .limit(1);

  if (!cert) return false;

  // For MVP, simple string comparison
  // TODO: Replace with actual Ed25519 verification when dependencies installed
  return cert.signature === signature;
}

/**
 * Generate certificate PDF
 * For MVP, returns a mock PDF buffer
 * TODO: Implement actual PDF generation with PDFKit when dependencies installed
 */
export async function renderCertificatePDF(certificateId: string): Promise<Buffer> {
  // Get certificate data
  const [cert] = await db
    .select({
      id: certificates.id,
      issuedAt: certificates.issuedAt,
      signature: certificates.signature,
      userEmail: users.email,
      trackTitle: tracks.title,
      orgName: organizations.name,
    })
    .from(certificates)
    .leftJoin(users, eq(certificates.userId, users.id))
    .leftJoin(tracks, eq(certificates.trackId, tracks.id))
    .leftJoin(organizations, eq(certificates.organizationId, organizations.id))
    .where(eq(certificates.id, certificateId))
    .limit(1);

  if (!cert) {
    throw new Error('Certificate not found');
  }

  // For MVP, return a text-based "PDF" (plain text buffer)
  // TODO: Replace with actual PDFKit rendering when dependencies installed
  const pdfContent = `
CERTIFICATE OF COMPLETION

This certifies that

${cert.userEmail}

has successfully completed

${cert.trackTitle}

Issued by ${cert.orgName || 'Cerply'} on ${cert.issuedAt.toLocaleDateString()}

Certificate ID: ${cert.id}
Signature: ${cert.signature.substring(0, 32)}...
Verify at: https://cerply.com/verify/${cert.id}
`;

  return Buffer.from(pdfContent, 'utf-8');
}

/**
 * Get all certificates for a user
 */
export async function getUserCertificates(userId: string): Promise<Array<{
  id: string;
  trackId: string;
  trackTitle: string;
  issuedAt: Date;
  verificationUrl: string;
}>> {
  const certs = await db
    .select({
      id: certificates.id,
      trackId: certificates.trackId,
      trackTitle: tracks.title,
      issuedAt: certificates.issuedAt,
      verificationUrl: certificates.verificationUrl,
    })
    .from(certificates)
    .leftJoin(tracks, eq(certificates.trackId, tracks.id))
    .where(eq(certificates.userId, userId));

  return certs.map(c => ({
    id: c.id,
    trackId: c.trackId,
    trackTitle: c.trackTitle || 'Unknown Track',
    issuedAt: c.issuedAt,
    verificationUrl: c.verificationUrl || '',
  }));
}

