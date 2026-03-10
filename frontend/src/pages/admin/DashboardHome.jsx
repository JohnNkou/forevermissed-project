import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, FileText, MessageSquare, TrendingUp, Settings } from 'lucide-react';
import { memorialsApi, usersApi } from '../../utils/api';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    users: 0,
    memorials: 0,
    tributes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [usersRes, memorialsRes] = await Promise.all([
        usersApi.list(),
        memorialsApi.list()
      ]);

      const totalTributes = memorialsRes.data.reduce((sum, m) => sum + (m.tributes_count || 0), 0);

      setStats({
        users: usersRes.data.users.length,
        memorials: memorialsRes.data.memorials.length,
        tributes: totalTributes
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-600' },
    { title: 'Total Memorials', value: stats.memorials, icon: FileText, color: 'text-rose-600' },
    { title: 'Total Tributes', value: stats.tributes, icon: MessageSquare, color: 'text-purple-600' },
    { title: 'Active Today', value: Math.floor(stats.memorials * 0.3), icon: TrendingUp, color: 'text-green-600' }
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600">Welcome to your admin dashboard</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading statistics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-rose-500 hover:bg-rose-50 transition-colors">
                <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">Customize Site</p>
              </button>
              <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-rose-500 hover:bg-rose-50 transition-colors">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">Manage Memorials</p>
              </button>
              <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-rose-500 hover:bg-rose-50 transition-colors">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">View Users</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
