'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Laptop, Smartphone } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

import { Session } from '@/lib/types';

export const columns: ColumnDef<Session['session']>[] = [
  {
    header: 'Device',
    id: 'user-agent',
    cell: ({ row }) => {
      const session = row.original;

      return (
        <div className="flex items-center gap-2">
          {new UAParser(session.userAgent || '').getDevice().type === 'mobile' ? (
            <Smartphone size={16} />
          ) : (
            <Laptop size={16} />
          )}
          {new UAParser(session.userAgent || '').getOS().name},{' '}
          {new UAParser(session.userAgent || '').getBrowser().name}
        </div>
      );
    },
  },
  {
    header: 'Created At',
    accessorKey: 'createdAt',
    cell: ({ row }) => {
      const session = row.original;

      const date = new Date(session.createdAt);
      return <span>{date.toLocaleString()}</span>;
    },
  },
];
