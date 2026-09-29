import React from 'react';
import { LockDialog } from './LockDialog';
import { AddMaterialDialog } from './AddMaterialDialog';

/** Mount once: listens for classroom:edit-lock and classroom:add-material events. */
export const PlacementHost: React.FC = () => (<><LockDialog /><AddMaterialDialog /></>);
