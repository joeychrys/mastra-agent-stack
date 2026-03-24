import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

import { EmailTemplateProps } from '@/lib/types';

export const DeleteAccountEmail: React.FC<Readonly<EmailTemplateProps>> = ({ user, url }) => (
  <Html>
    <Head />
    <Preview>Verify your account deletion</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Verify your account deletion</Heading>
        <Text style={text}>Click the button below to verify your account deletion.</Text>
        <Button style={button} href={url}>
          Verify Account Deletion
        </Button>
        <Text style={{ ...text, marginTop: '24px' }}>
          If the button above does not work, copy and paste the URL below into your browser:
        </Text>
        <Link href={url} style={link}>
          {url}
        </Link>
        <Text style={{ ...text, marginTop: '24px' }}>
          If you didn&apos;t request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '5px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  margin: '40px auto',
  padding: '40px 20px',
  maxWidth: '400px',
};

const h1 = {
  color: '#000',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  textAlign: 'center' as const,
  padding: '0',
};

const text = {
  color: '#000',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const button = {
  backgroundColor: '#000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};

const link = {
  color: '#2754C5',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
};
