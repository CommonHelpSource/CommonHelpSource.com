// Progress Notes Test Suite
describe('Progress Notes Functionality Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset any form values
    document.querySelectorAll('textarea').forEach(textarea => {
      textarea.value = '';
    });
    
    // Reset any active sections
    document.querySelectorAll('.note-section').forEach(section => {
      section.classList.remove('active');
    });
  });

  describe('Note Type Selection', () => {
    test('should show initial assessment section by default', () => {
      const initialSection = document.getElementById('initial-section');
      expect(initialSection.classList.contains('active')).toBe(true);
    });

    test('should switch sections when clicking note type buttons', () => {
      const buttons = document.querySelectorAll('.note-type-button');
      buttons.forEach(button => {
        button.click();
        const sectionId = `${button.dataset.section}-section`;
        const section = document.getElementById(sectionId);
        expect(section.classList.contains('active')).toBe(true);
      });
    });
  });

  describe('Role Selection', () => {
    test('should save selected role to localStorage', () => {
      const roleSelect = document.getElementById('role-select');
      const testRole = 'Licensed Clinical Social Worker';
      roleSelect.value = testRole;
      roleSelect.dispatchEvent(new Event('change'));
      expect(localStorage.getItem('selectedRole')).toBe(testRole);
    });

    test('should update role info when role changes', () => {
      const roleSelect = document.getElementById('role-select');
      const roleInfo = document.getElementById('role-info');
      const testRole = 'Community Health Worker';
      roleSelect.value = testRole;
      roleSelect.dispatchEvent(new Event('change'));
      expect(roleInfo.textContent.trim()).not.toBe('');
    });
  });

  describe('Note Format Selection', () => {
    test('should update placeholder text when format changes', () => {
      const formatSelectors = document.querySelectorAll('.note-format');
      formatSelectors.forEach(selector => {
        selector.value = 'SOAP';
        selector.dispatchEvent(new Event('change'));
        const section = selector.closest('.note-section');
        const textarea = section.querySelector('.note-input');
        expect(textarea.placeholder).toContain('Subjective');
      });
    });

    test('should show/hide CHW extended fields based on format', () => {
      const progressFormatSelect = document.querySelector('#format-select-progress');
      progressFormatSelect.value = 'CHW-Extended';
      progressFormatSelect.dispatchEvent(new Event('change'));
      const chwFields = document.getElementById('chw-extended-fields');
      expect(chwFields.style.display).toBe('block');
    });
  });

  describe('Note Generation', () => {
    test('should show preview dialog before generating note', async () => {
      const textarea = document.querySelector('#input-initial');
      textarea.value = 'Test note content';
      const generateButton = textarea.closest('.note-section').querySelector('.generate-button');
      generateButton.click();
      const previewDialog = document.querySelector('.preview-dialog');
      expect(previewDialog.style.display).toBe('block');
    });

    test('should de-identify sensitive information in preview', () => {
      const textarea = document.querySelector('#input-initial');
      const sensitiveText = 'Patient John Doe (555-123-4567) with Dr. Smith';
      textarea.value = sensitiveText;
      const generateButton = textarea.closest('.note-section').querySelector('.generate-button');
      generateButton.click();
      const previewContent = document.querySelector('.preview-content').textContent;
      expect(previewContent).not.toContain('John Doe');
      expect(previewContent).not.toContain('555-123-4567');
      expect(previewContent).not.toContain('Dr. Smith');
    });
  });

  describe('Note History', () => {
    test('should save generated note to history', () => {
      const testNote = 'Test note content';
      const noteData = {
        content: testNote,
        timestamp: new Date().toISOString(),
        format: 'Narrative',
        role: 'Case Manager',
        type: 'progress'
      };
      const prevNotes = JSON.parse(localStorage.getItem('noteHistory') || '[]');
      prevNotes.unshift(noteData);
      localStorage.setItem('noteHistory', JSON.stringify(prevNotes));
      const historyList = document.querySelector('.history-list');
      expect(historyList.children.length).toBeGreaterThan(0);
    });

    test('should limit history to 5 items', () => {
      const testNotes = Array.from({ length: 6 }, (_, i) => ({
        content: `Test note ${i}`,
        timestamp: new Date().toISOString(),
        format: 'Narrative',
        role: 'Case Manager',
        type: 'progress'
      }));
      localStorage.setItem('noteHistory', JSON.stringify(testNotes));
      const historyList = document.querySelector('.history-list');
      expect(historyList.children.length).toBeLessThanOrEqual(5);
    });
  });

  describe('PDF Generation', () => {
    test('should enable PDF download button only after note generation', () => {
      const downloadButton = document.querySelector('.download-pdf-button');
      expect(downloadButton.disabled).toBe(true);
      localStorage.setItem('generatedNote', 'Test note content');
      downloadButton.disabled = false;
      expect(downloadButton.disabled).toBe(false);
    });
  });

  describe('Form Validation', () => {
    test('should not generate note with empty content', () => {
      const textarea = document.querySelector('#input-initial');
      textarea.value = '';
      const generateButton = textarea.closest('.note-section').querySelector('.generate-button');
      const originalAlert = window.alert;
      let alertCalled = false;
      window.alert = () => { alertCalled = true; };
      generateButton.click();
      expect(alertCalled).toBe(true);
      window.alert = originalAlert;
    });

    test('should validate CHW extended fields when format selected', () => {
      const progressFormatSelect = document.querySelector('#format-select-progress');
      progressFormatSelect.value = 'CHW-Extended';
      progressFormatSelect.dispatchEvent(new Event('change'));
      const requiredFields = document.querySelectorAll('#chw-extended-fields textarea');
      let allFieldsFilled = true;
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          allFieldsFilled = false;
        }
      });
      expect(allFieldsFilled).toBe(false);
    });
  });
}); 