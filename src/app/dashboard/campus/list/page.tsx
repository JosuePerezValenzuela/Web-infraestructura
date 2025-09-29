'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { campusColumns, type CampusRow } from '@/features/campus/list/columns';
import { Plus } from 'lucide-react';
import Link from 'next/link';

const TAKE = 10;

export default function CampusListPage() {
  const [items, setItems] = useState<CampusRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');

  const query = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(TAKE),
          ...(query ? { search: query } : {}),
        });
      
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/campus?${params.toString()}`,
          { signal: controller.signal }
        );
        
        if (!res.ok) {
          console.error('Error cargando campus');
        return;
        }

        const data = await res.json() as {
          items: CampusRow[];
          meta: { page: number; take: number; pages: number; total: number };
        }

        setItems(data.items);
        setPage(data.meta.page);
        setPages(data.meta.pages);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('Error cargando campus', err);
      }
    })();

    return () => controller.abort();
  }, [page, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Campus</h1>

        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar por nombre o direccion"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />

          <Button asChild>
            <Link href="/dashboard/campus/new">
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Link>
          </Button>
        </div>
      </div>

      <DataTable
        columns={campusColumns}
        data={items}
        page={page}
        pages={pages}
        onPageChange={setPage}
      />
    </div>
  );
}
