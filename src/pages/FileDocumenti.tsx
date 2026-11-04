import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileArchive } from '@/components/documenti/FileArchive';
import { OneDriveExplorer } from '@/components/documenti/OneDriveExplorer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumenti } from '@/hooks/useDocumenti';
import { useOneDriveSync } from '@/hooks/useOneDriveSync';
import { FileText, FolderOpen, Sparkles, AlertTriangle, CloudUpload, RefreshCw } from 'lucide-react';

export default function FileDocumenti() {
  const { data: documenti = [], isLoading: loadingDocs } = useDocumenti();
  const { status, loading: loadingOd } = useOneDriveSync();

  const stats = useMemo(() => {
    const trentaGiorniFa = new Date(Date.now() - 30 * 86400000).toISOString();
    return {
      documenti: documenti.length,
      nuovi: documenti.filter((d) => d.created_at >= trentaGiorniFa).length,
      analisi: documenti.filter((d) => d.stato_elaborazione === 'archiviato').length,
      inElaborazione: documenti.filter((d) => d.stato_elaborazione === 'in_elaborazione').length,
      daVerificare: documenti.filter((d) => d.stato_elaborazione === 'da_verificare').length,
      errori: documenti.filter((d) => d.stato_elaborazione === 'errore').length,
    };
  }, [documenti]);

  const od = status?.conteggi;
  const loading = loadingDocs || loadingOd;

  return (
    <MainLayout>
      <div className="min-w-0 space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">File e documenti</h1>
          <p className="text-xs text-muted-foreground">
            Un unico archivio: i file di OneDrive e i documenti del CRM rappresentano la stessa memoria.
          </p>
        </header>

        {/* Dashboard documentale compatta */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={<CloudUpload className="h-4 w-4 text-primary" />} label="File OneDrive" value={od?.sincronizzati} loading={loading} />
          <StatCard icon={<FolderOpen className="h-4 w-4 text-primary" />} label="Cartelle" value={od?.cartelle} loading={loading} />
          <StatCard icon={<FileText className="h-4 w-4 text-info" />} label="Documenti CRM" value={stats.documenti} loading={loading} />
          <StatCard icon={<Sparkles className="h-4 w-4 text-success" />} label="Analisi AI completate" value={stats.analisi} loading={loading} />
          <StatCard icon={<RefreshCw className="h-4 w-4 text-warning" />} label="Nuovi (30 gg)" value={stats.nuovi} loading={loading} />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            label="Da verificare / errori"
            value={stats.daVerificare + stats.errori + (od?.errori ?? 0) + (od?.conflitti ?? 0)}
            loading={loading}
            tone={stats.daVerificare + stats.errori + (od?.errori ?? 0) + (od?.conflitti ?? 0) > 0 ? 'destructive' : undefined}
          />
        </div>

        <Tabs defaultValue="onedrive">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto">
            <TabsTrigger value="onedrive">OneDrive</TabsTrigger>
            <TabsTrigger value="crm">Documenti CRM</TabsTrigger>
          </TabsList>
          <TabsContent value="onedrive" className="mt-4">
            <OneDriveExplorer />
          </TabsContent>
          <TabsContent value="crm" className="mt-4">
            <FileArchive />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function StatCard({ icon, label, value, loading, tone }: {
  icon: React.ReactNode; label: string; value?: number; loading: boolean; tone?: 'destructive';
}) {
  return (
    <div className={`rounded-xl border bg-card p-3 transition hover-lift ${tone === 'destructive' ? 'border-destructive/40' : 'border-border'}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="min-w-0 break-words leading-tight">{label}</span>
      </div>
      <div className={`mt-1.5 text-right font-display text-xl font-bold tabular-nums ${tone === 'destructive' ? 'text-destructive' : ''}`}>
        {loading ? <Skeleton className="ml-auto h-6 w-10" /> : value ?? 0}
      </div>
    </div>
  );
}
