import Swal from 'sweetalert2';

export const confirmDelete = async (message: string = 'Are you sure you want to delete this record?'): Promise<boolean> => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444', // Tailwind red-500
    cancelButtonColor: '#64748b', // Tailwind slate-500
    confirmButtonText: 'Yes, delete it!'
  });
  return result.isConfirmed;
};

export const confirmUpdate = async (message: string = 'Are you sure you want to update this record?'): Promise<boolean> => {
  const result = await Swal.fire({
    title: 'Confirm Update',
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3b82f6', // Tailwind blue-500
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Yes, update it!'
  });
  return result.isConfirmed;
};

export const confirmAdd = async (message: string = 'Are you sure you want to add this record?'): Promise<boolean> => {
  const result = await Swal.fire({
    title: 'Confirm Addition',
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981', // Tailwind emerald-500
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Yes, add it!'
  });
  return result.isConfirmed;
};
