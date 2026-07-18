// mod_xml_curl binding: FreeSWITCH asks this endpoint for SIP directory
// entries, so extensions live in Postgres — create a user in the dashboard
// and their softphone can register immediately, no FS reload needed.

import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { one } from '../db/index.js';

const NOT_FOUND = `<?xml version="1.0"?>
<document type="freeswitch/xml"><section name="result"><result status="not found"/></section></document>`;

export function freeswitchRoutes(app: FastifyInstance): void {
  app.post('/webhooks/fs/xml', async (req, reply) => {
    const b = req.body as Record<string, string>;
    reply.type('text/xml');

    if (b.section !== 'directory' || !b.user) return NOT_FOUND;

    const user = await one<{ extension: string; sip_password: string; name: string }>(
      'SELECT extension, sip_password, name FROM users WHERE extension = $1',
      [b.user],
    );
    if (!user) return NOT_FOUND;

    return `<?xml version="1.0"?>
<document type="freeswitch/xml">
  <section name="directory">
    <domain name="${config.sipDomain}">
      <user id="${user.extension}">
        <params>
          <param name="password" value="${user.sip_password}"/>
        </params>
        <variables>
          <variable name="effective_caller_id_name" value="${user.name.replace(/"/g, '')}"/>
          <variable name="effective_caller_id_number" value="${user.extension}"/>
          <variable name="user_context" value="default"/>
        </variables>
      </user>
    </domain>
  </section>
</document>`;
  });
}
