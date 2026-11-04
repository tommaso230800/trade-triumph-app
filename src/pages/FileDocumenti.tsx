import { MainLayout } from '@/components/layout/MainLayout';
import { FileArchive } from '@/components/documenti/FileArchive';
import { OneDriveExplorer } from '@/components/documenti/OneDriveExplorer';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
export default function FileDocumenti(){return <MainLayout><div className="space-y-6 min-w-0"><h1 className="text-2xl font-bold">File e documenti</h1><Tabs defaultValue="onedrive"><TabsList><TabsTrigger value="onedrive">OneDrive</TabsTrigger><TabsTrigger value="crm">Documenti CRM</TabsTrigger></TabsList><TabsContent value="onedrive"><OneDriveExplorer/></TabsContent><TabsContent value="crm"><FileArchive/></TabsContent></Tabs></div></MainLayout>;}
