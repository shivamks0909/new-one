import { db } from '../db';
import { Study } from '../types';
import { signRedirectUrl } from './trackingService';

export interface ExternalPlatform {
  id: string;
  platform_code: string;
  name: string;
  base_url: string;
  offer_param_name: string;
  respondent_param_name: string;
  status: string;
  config_json: Record<string, any>;
}

export interface ExternalOffer {
  id: string;
  platform_id: string;
  external_offer_id: string;
  name: string;
  survey_url: string;
  status: string;
  discovery_method: 'AUTO' | 'MANUAL' | 'API';
  first_seen_at: Date;
  last_seen_at: Date;
  metadata: Record<string, any>;
}

export class DiscoveryService {
  /**
   * Generate signed redirect URLs for a specific UID.
   * These URLs include HMAC signatures to prevent forgery.
   */
  generateSignedRedirectUrls(baseUrl: string, offerId: string, uid: string): Record<string, string> {
    const cleanOfferId = offerId.trim().toUpperCase();
    const encodedUid = encodeURIComponent(uid);
    
    return {
      complete: `${baseUrl}/redirect/complete?pid=${cleanOfferId}&uid=${encodedUid}&sig=${signRedirectUrl({ pid: cleanOfferId, uid, outcome: 'complete' })}`,
      terminate: `${baseUrl}/redirect/terminate?pid=${cleanOfferId}&uid=${encodedUid}&sig=${signRedirectUrl({ pid: cleanOfferId, uid, outcome: 'terminate' })}`,
      quotaFull: `${baseUrl}/redirect/quota?pid=${cleanOfferId}&uid=${encodedUid}&sig=${signRedirectUrl({ pid: cleanOfferId, uid, outcome: 'quota' })}`,
      qualityTerm: `${baseUrl}/redirect/quality?pid=${cleanOfferId}&uid=${encodedUid}&sig=${signRedirectUrl({ pid: cleanOfferId, uid, outcome: 'quality' })}`,
      surveyClose: `${baseUrl}/redirect/close?pid=${cleanOfferId}&uid=${encodedUid}&sig=${signRedirectUrl({ pid: cleanOfferId, uid, outcome: 'close' })}`,
    };
  }

  /**
   * Resolves or automatically creates an external offer and its corresponding local study representation.
   * Ensures idempotency so concurrent requests with the same offerId resolve to a single study.
   */
  async resolveOrCreateExternalOffer(
    externalOfferId: string,
    platformCode = 'ZEPHYR',
    requestMeta: { survey_url?: string; name?: string } = {}
  ): Promise<{ offer: ExternalOffer; study: Study; platform: ExternalPlatform }> {
    const cleanOfferId = externalOfferId.trim().toUpperCase();
    if (!cleanOfferId) {
      throw new Error('External offer ID is required');
    }

    // 1. Resolve platform
    const platform = await db.getExternalPlatformByCode(platformCode);
    if (!platform) {
      throw new Error(`External platform '${platformCode}' not found`);
    }

    // 2. Check if external offer exists
    let offer = await db.getExternalOffer(platform.id, cleanOfferId);
    
    if (!offer) {
      // Build survey URL
      let surveyUrl = requestMeta.survey_url || '';
      if (!surveyUrl && platform.base_url) {
        surveyUrl = `${platform.base_url}/Survey?${platform.offer_param_name || 'offerId'}=${cleanOfferId}&${platform.respondent_param_name || 'zid'}={uid}`;
      }

      const offerName = requestMeta.name || `Survey Offer ${cleanOfferId}`;

      offer = await db.createExternalOffer({
        platform_id: platform.id,
        external_offer_id: cleanOfferId,
        name: offerName,
        survey_url: surveyUrl,
        status: 'ACTIVE',
        discovery_method: 'AUTO',
        metadata: { discovered_via: 'HTTP_REQUEST' }
      });
    } else {
      // Update last seen
      await db.touchExternalOffer(offer.id);
    }

    // 3. Check if local study exists for this external offer
    let study = await db.getStudyByExternalOfferId(cleanOfferId);

    if (!study) {
      // Get default client
      const clients = await db.getClients();
      let clientId = clients[0]?.id;
      if (!clientId) {
        const newClient = await db.createClient({
          client_code: 'CL-SYSTEM',
          name: 'Default System Client',
          status: 'ACTIVE'
        });
        clientId = newClient.id;
      }

      // Generate unique study_code
      const studyCode = `STD-${cleanOfferId}`;
      const surveyUrl = offer.survey_url || `${platform.base_url}/Survey?offerId=${cleanOfferId}&zid={uid}`;

      study = await db.createStudy({
        study_code: studyCode,
        client_id: clientId,
        title: offer.name || `Survey Offer ${cleanOfferId}`,
        description: `Auto-discovered study for offer ${cleanOfferId} from ${platform.name}`,
        country: 'US',
        market: 'Global',
        language: 'en',
        survey_url: surveyUrl,
        survey_platform: platform.name,
        target_completes: 1000,
        loi_minutes: 10,
        incidence_rate: 50,
        client_cpi: 2.50,
        status: 'LIVE',
        external_offer_id: cleanOfferId,
        source_platform: platform.platform_code,
        discovery_method: 'AUTO',
        created_by: 'auto-discovery-engine'
      });

      // Automatically assign default vendor to this study (auto-create one if needed)
      let vendors = await db.getVendors(true);
      if (vendors.length === 0) {
        try {
          const defaultVendor = await db.createVendor({
            vendor_code: 'VND-DEFAULT',
            name: 'Default Vendor',
            status: 'ACTIVE',
            notes: 'Auto-created vendor for redirect persistence'
          });
          vendors = [defaultVendor];
        } catch (e: any) {
          console.error('[Discovery:vendor]', e?.message);
        }
      }
      for (const vendor of vendors) {
        try {
          await db.assignVendorToStudy({
            study_id: study.id,
            vendor_id: vendor.id,
            vendor_cpi: 1.50,
            target_completes: 500,
            max_completes: 1000,
            status: 'ACTIVE'
          });
        } catch {}

        try {
          await db.createTrackingLink({
            study_id: study.id,
            vendor_id: vendor.id,
            link_code: `lnk_${cleanOfferId.toLowerCase()}_${vendor.id.slice(0, 4)}`,
            public_token: `tok_${cleanOfferId.toLowerCase()}_${vendor.id.slice(0, 4)}_${Math.random().toString(36).substring(7)}`,
            base_url: surveyUrl,
            uid_mode: 'PROVIDED_UID',
            status: 'ACTIVE'
          });
        } catch (e: any) {
          console.error('[Discovery:trackingLink]', e?.message);
        }
      }

      await db.createAuditLog({
        user: 'system:auto-discovery',
        action: 'STUDY_AUTO_CREATED',
        entity: 'study',
        entity_id: study.id,
        before: null,
        after: { external_offer_id: cleanOfferId, title: study.title },
        ip: null
      });
    }

    return { offer, study, platform };
  }

  /**
   * Analyzes an external client survey URL template (e.g. https://pmtool.zephyrsample.com/Survey?offerId=OF39672293MNBI&zid=[identifier]),
   * extracts the offerId and respondent parameter name, auto-registers/upserts the study record, and returns all operational URLs.
   */
  async analyzeAndRegisterSurveyUrl(
    surveyUrlTemplate: string,
    baseUrl: string = 'http://localhost:3000'
  ) {
    const rawUrl = surveyUrlTemplate.trim();
    if (!rawUrl) {
      throw new Error('Survey URL template is required');
    }

    // Parse URL
    let urlObj: URL;
    try {
      urlObj = new URL(rawUrl);
    } catch {
      throw new Error('Invalid survey URL template format');
    }

    // Extract offerId
    const offerId = urlObj.searchParams.get('offerId') || 
                    urlObj.searchParams.get('offer_id') || 
                    urlObj.searchParams.get('pid') || 
                    urlObj.searchParams.get('studyId') || 
                    urlObj.searchParams.get('study_id') || '';

    if (!offerId) {
      throw new Error('Could not detect offerId parameter in survey URL template');
    }

    // Detect identifier parameter name
    let idParamName = 'zid';
    urlObj.searchParams.forEach((val, key) => {
      if (val.includes('[identifier]') || val.includes('{uid}') || val.includes('%5Bidentifier%5D')) {
        idParamName = key;
      }
    });

    // Resolve or auto-create study
    const { study } = await this.resolveOrCreateExternalOffer(offerId, 'ZEPHYR', {
      survey_url: rawUrl,
      name: `Auto-Discovered ${offerId}`
    });

    const cleanOfferId = offerId.trim().toUpperCase();
    const placeholderUid = '[identifier]';
    const encodedPlaceholderUid = encodeURIComponent(placeholderUid);

    // Generate redirect URL templates with signature placeholder
    const redirectUrlTemplates = {
      complete: `${baseUrl}/redirect/complete?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}&sig=[signature]`,
      terminate: `${baseUrl}/redirect/terminate?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}&sig=[signature]`,
      quotaFull: `${baseUrl}/redirect/quota?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}&sig=[signature]`,
      qualityTerm: `${baseUrl}/redirect/quality?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}&sig=[signature]`,
      surveyClose: `${baseUrl}/redirect/close?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}&sig=[signature]`,
    };

    // Also generate unsigned templates for backward compatibility
    const unsignedRedirectUrls = {
      complete: `${baseUrl}/redirect/complete?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}`,
      terminate: `${baseUrl}/redirect/terminate?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}`,
      quotaFull: `${baseUrl}/redirect/quota?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}`,
      qualityTerm: `${baseUrl}/redirect/quality?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}`,
      surveyClose: `${baseUrl}/redirect/close?pid=${cleanOfferId}&uid=${encodedPlaceholderUid}`,
    };

    return {
      offerId: cleanOfferId,
      study,
      idParamName,
      surveyUrlTemplate: rawUrl,
      trackingUrl: `${baseUrl}/start?offerId=${cleanOfferId}&${idParamName}=[identifier]`,
      redirectUrls: unsignedRedirectUrls,
      signedRedirectUrlTemplates: redirectUrlTemplates,
    };
  }
}

export const discoveryService = new DiscoveryService();
