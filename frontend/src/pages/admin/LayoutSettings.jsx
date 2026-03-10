import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from '../../hooks/use-toast';
import { settingsApi } from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { Save } from 'lucide-react';

const LayoutSettings = () => {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState({
    header: { position: 'sticky', height: 64, background: '#ffffff' },
    footer: { columns: 4, background: '#111827' },
    buttons: {
      size: 'md',
      position: 'left',
      border_radius: '6px',
      primary_color: '#000000',
      secondary_color: '#ffffff'
    },
    banner: {
      show: true,
      image_url: '',
      title: 'Create a Memorial Website',
      subtitle: 'Preserve and share memories of your loved one'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsApi.getLayout();
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateLayout(settings);
      refreshSettings();
      toast({ title: 'Success', description: 'Layout settings saved successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save layout settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleNestedChange = (parent, field, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Layout Settings</h2>
          <p className="text-gray-600">Customize header, footer, buttons, and banner</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Header Settings */}
      <Card>
        <CardHeader><CardTitle>Header Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Position</Label>
            <select
              value={settings.header.position}
              onChange={(e) => handleNestedChange('header', 'position', e.target.value)}
              className="mt-2 w-full px-3 py-2 border rounded-md"
            >
              <option value="sticky">Sticky</option>
              <option value="static">Static</option>
            </select>
          </div>
          <div>
            <Label>Height (px)</Label>
            <Input
              type="number"
              value={settings.header.height}
              onChange={(e) => handleNestedChange('header', 'height', parseInt(e.target.value))}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Background Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                value={settings.header.background}
                onChange={(e) => handleNestedChange('header', 'background', e.target.value)}
                className="w-20"
              />
              <Input
                value={settings.header.background}
                onChange={(e) => handleNestedChange('header', 'background', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Settings */}
      <Card>
        <CardHeader><CardTitle>Button Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Size</Label>
            <select
              value={settings.buttons.size}
              onChange={(e) => handleNestedChange('buttons', 'size', e.target.value)}
              className="mt-2 w-full px-3 py-2 border rounded-md"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
          <div>
            <Label>Border Radius</Label>
            <Input
              value={settings.buttons.border_radius}
              onChange={(e) => handleNestedChange('buttons', 'border_radius', e.target.value)}
              placeholder="6px"
              className="mt-2"
            />
          </div>
          <div>
            <Label>Primary Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                value={settings.buttons.primary_color}
                onChange={(e) => handleNestedChange('buttons', 'primary_color', e.target.value)}
                className="w-20"
              />
              <Input
                value={settings.buttons.primary_color}
                onChange={(e) => handleNestedChange('buttons', 'primary_color', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banner Settings */}
      <Card>
        <CardHeader><CardTitle>Banner Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.banner.show}
              onCheckedChange={(checked) => handleNestedChange('banner', 'show', checked)}
            />
            <Label>Show Banner</Label>
          </div>
          <div>
            <Label>Banner Title</Label>
            <Input
              value={settings.banner.title}
              onChange={(e) => handleNestedChange('banner', 'title', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Banner Subtitle</Label>
            <Input
              value={settings.banner.subtitle}
              onChange={(e) => handleNestedChange('banner', 'subtitle', e.target.value)}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader><CardTitle>Footer Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Number of Columns</Label>
            <Input
              type="number"
              min="1"
              max="6"
              value={settings.footer.columns}
              onChange={(e) => handleNestedChange('footer', 'columns', parseInt(e.target.value))}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Background Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                value={settings.footer.background}
                onChange={(e) => handleNestedChange('footer', 'background', e.target.value)}
                className="w-20"
              />
              <Input
                value={settings.footer.background}
                onChange={(e) => handleNestedChange('footer', 'background', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LayoutSettings;
