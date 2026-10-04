import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Collection } from '../../types';
import Modal from '../ui/Modal';

interface SaveDialogProps {
  collections: Collection[];
  defaultName: string;
  defaultCollectionId: string | null;
  onSave: (name: string, collectionId: string) => void;
  onCreateCollection: (name: string) => string;
  onClose: () => void;
}

export default function SaveDialog({
  collections,
  defaultName,
  defaultCollectionId,
  onSave,
  onCreateCollection,
  onClose,
}: SaveDialogProps) {
  const [name, setName] = useState(defaultName);
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? collections[0]?.id ?? '');
  const [creating, setCreating] = useState(collections.length === 0);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this request a name.');
      return;
    }

    if (creating) {
      const created = newCollectionName.trim();
      if (!created) {
        setError('Enter a name for the new collection.');
        return;
      }
      onSave(trimmed, onCreateCollection(created));
      return;
    }

    if (!collectionId) {
      setError('Choose a collection to save into.');
      return;
    }
    onSave(trimmed, collectionId);
  }

  return (
    <Modal title="Save request" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="save-name">
            Request name
          </label>
          <input
            id="save-name"
            className="text-input"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Get all users"
            autoFocus
          />
        </div>

        {creating ? (
          <div className="field">
            <label className="field-label" htmlFor="save-new-collection">
              New collection
            </label>
            <input
              id="save-new-collection"
              className="text-input"
              value={newCollectionName}
              onChange={(event) => {
                setNewCollectionName(event.target.value);
                setError(null);
              }}
              placeholder="User API"
              autoFocus
            />
          </div>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="save-collection">
              Collection
            </label>
            <select id="save-collection" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {collections.length > 0 && (
          <button type="button" className="link-btn" onClick={() => setCreating((current) => !current)}>
            {creating ? 'Choose an existing collection' : '+ Create a new collection'}
          </button>
        )}

        {error && <p className="dialog-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
