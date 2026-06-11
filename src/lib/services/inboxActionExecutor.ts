import { updateAssignmentStatus } from '@/actions/vendorAssignment';
import { approveLedgerItem } from '@/actions/index';
import { projectsService } from '@/lib/firebase/projects';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

export async function executeInboxAction(
  item: any, // Notification
  idToken: string,
  userEmail: string
): Promise<{ success: boolean; message: string }> {
  const projectId = item.objectReference?.projectId;
  if (!projectId) {
    throw new Error('Project context missing from notification.');
  }

  if (item.type === 'VENDOR_BID') {
    // 1. Resolve assignmentId
    let assignmentId = item.objectReference?.metadata?.assignmentId || item.objectReference?.assignmentId;
    
    if (!assignmentId) {
      // Robust lookup: find PENDING assignment matching vendor name
      const vendorName = item.objectReference?.vendor || item.actor?.name;
      const assignmentsRef = collection(db, 'projects', projectId, 'vendorAssignments');
      const q = query(assignmentsRef, where('status', '==', 'PENDING'));
      const snap = await getDocs(q);
      
      const matched = snap.docs.find(d => {
        const data = d.data();
        return data.vendorName === vendorName || data.vendorCompanyName === vendorName;
      });
      
      if (matched) {
        assignmentId = matched.id;
      }
    }

    if (!assignmentId) {
      throw new Error('Could not resolve vendor assignment reference.');
    }

    // 2. Parse quotedFee
    const amountStr = item.objectReference?.amount || '';
    const quotedFee = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

    // 3. Call server action
    const res = await updateAssignmentStatus(idToken, projectId, assignmentId, 'ACCEPTED', quotedFee);
    if (!res.success) {
      throw new Error(res.error || 'Failed to approve vendor assignment.');
    }

    return { success: true, message: 'Vendor assignment approved successfully.' };

  } else if (item.type === 'RECEIPT_APPROVAL') {
    // 1. Check sub-collection ledgerItems
    let itemId = item.objectReference?.metadata?.ledgerItemId || item.objectReference?.ledgerItemId;
    
    if (!itemId) {
      // Robust lookup: search in projects/{projectId}/ledgerItems subcollection
      const ledgersRef = collection(db, 'projects', projectId, 'ledgerItems');
      const q = query(ledgersRef, where('status', '==', 'Pending'));
      const snap = await getDocs(q);
      
      // Try matching by amount
      const amountStr = item.objectReference?.amount || '';
      const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;
      
      const matched = snap.docs.find(d => {
        const data = d.data();
        return data.amount === amount;
      });
      
      if (matched) {
        itemId = matched.id;
      }
    }

    if (itemId) {
      // Call server action to approve ledger item
      const res = await approveLedgerItem(idToken, projectId, itemId);
      if (!res.success) {
        throw new Error('Failed to approve ledger item.');
      }
      return { success: true, message: 'Ledger item approved successfully.' };
    } else {
      // 2. Fallback: Legacy costs array update
      const docRef = doc(db, 'projects', projectId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Project not found');
      
      const projectData = snap.data();
      const amountStr = item.objectReference?.amount || '';
      const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;
      
      const currentCosts = projectData.financials?.costs || [];
      let foundCost = false;
      const updatedCosts = currentCosts.map((cost: any) => {
        if (cost.amount === amount && (cost.status === 'Pending Triage' || !cost.approved)) {
          foundCost = true;
          return { ...cost, approved: true, status: 'Approved' };
        }
        return cost;
      });

      if (!foundCost) {
        throw new Error('Could not resolve receipt cost entry in project.');
      }

      await projectsService.updateProject(projectId, {
        financials: {
          ...projectData.financials,
          costs: updatedCosts
        }
      });
      
      return { success: true, message: 'Receipt cost entry approved successfully.' };
    }

  } else if (item.type === 'INVEST_INVITE') {
    // 1. Resolve invitation token
    let token = item.objectReference?.metadata?.token || item.objectReference?.token;
    
    if (!token) {
      // Robust lookup: search in invitations collection
      const invitationsRef = collection(db, 'invitations');
      const q = query(
        invitationsRef, 
        where('projectId', '==', projectId), 
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      
      const matched = snap.docs.find(d => {
        const data = d.data();
        return data.email === userEmail;
      });
      
      if (matched) {
        token = matched.data().token;
      } else if (snap.docs.length > 0) {
        // Fallback to first pending invitation for the project if email doesn't match
        token = snap.docs[0].data().token;
      }
    }

    if (!token) {
      throw new Error('Could not resolve invitation token.');
    }

    // 2. Call response API
    const res = await fetch('/api/invitations/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        action: 'accept',
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to accept invitation.');
    }

    return { success: true, message: 'Invitation accepted successfully.' };
  }

  throw new Error('Unsupported action execution type.');
}
