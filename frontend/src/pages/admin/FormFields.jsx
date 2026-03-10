import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { formFieldsApi } from '../../utils/api';
import { Plus, Trash2, Edit } from 'lucide-react';

const FormFields = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: 'text',
    label: '',
    placeholder: '',
    required: false,
    enabled: true,
    options: []
  });

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      const response = await formFieldsApi.getAll();
      setFields(response.data);
    } catch (error) {
      console.error('Failed to load fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingField) {
        await formFieldsApi.update(editingField._id, formData);
        toast({ title: 'Success', description: 'Field updated successfully' });
      } else {
        await formFieldsApi.create(formData);
        toast({ title: 'Success', description: 'Field created successfully' });
      }
      setDialogOpen(false);
      resetForm();
      loadFields();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save field', variant: 'destructive' });
    }
  };

  const handleEdit = (field) => {
    setEditingField(field);
    setFormData({
      field_name: field.field_name,
      field_type: field.field_type,
      label: field.label,
      placeholder: field.placeholder || '',
      required: field.required,
      enabled: field.enabled,
      options: field.options || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this field?')) return;
    try {
      await formFieldsApi.delete(id);
      toast({ title: 'Success', description: 'Field deleted successfully' });
      loadFields();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete field', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      field_name: '',
      field_type: 'text',
      label: '',
      placeholder: '',
      required: false,
      enabled: true,
      options: []
    });
    setEditingField(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Form Fields</h2>
          <p className="text-gray-600">Manage custom fields for memorial forms</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingField ? 'Edit Field' : 'Add New Field'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Field Name</Label>
                <Input
                  value={formData.field_name}
                  onChange={(e) => setFormData({...formData, field_name: e.target.value})}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Field Type</Label>
                <select
                  value={formData.field_type}
                  onChange={(e) => setFormData({...formData, field_type: e.target.value})}
                  className="mt-2 w-full px-3 py-2 border rounded-md"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                  <option value="file">File</option>
                </select>
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Placeholder</Label>
                <Input
                  value={formData.placeholder}
                  onChange={(e) => setFormData({...formData, placeholder: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.required}
                  onCheckedChange={(checked) => setFormData({...formData, required: checked})}
                />
                <Label>Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                />
                <Label>Enabled</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingField ? 'Update' : 'Create'} Field
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{field.label}</h3>
                    <p className="text-sm text-gray-600">
                      Type: {field.field_type} | {field.required ? 'Required' : 'Optional'} | {field.enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(field)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(field._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FormFields;
