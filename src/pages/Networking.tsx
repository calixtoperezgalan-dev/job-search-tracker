import Layout from '../components/layout/Layout';
import { Card, Button } from '../components/ui';
import { Users, Plus } from 'lucide-react';

export default function Networking() {
  return (
    <Layout title="Networking" subtitle="Manage your professional contacts">
      <Card className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Networking Coming Soon</h3>
        <p className="text-gray-600 mb-4">Track contacts, referrals, and follow-ups</p>
        <Button><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
      </Card>
    </Layout>
  );
}
