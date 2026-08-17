const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// ==========================================
// GET /
// ==========================================
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'IoT Private Cloud API is running'
    });
});


// ==========================================
// POST /api/telemetry
// ESP32 ส่งแค่ device_id + temperature_c
// API จะสร้าง id และ seq เอง
// ==========================================
app.post('/api/telemetry', async (req, res) => {

    try {

        const { device_id, temperature_c } = req.body;


        // ---------- Validate device_id ----------
        if (
            typeof device_id !== 'string' ||
            device_id.trim() === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'device_id is required'
            });
        }


        // ---------- Validate temperature ----------
        if (
            typeof temperature_c !== 'number' ||
            !Number.isFinite(temperature_c)
        ) {
            return res.status(400).json({
                success: false,
                message: 'temperature_c must be a valid number'
            });
        }


        // ==========================================
        // หา ID ล่าสุด
        // ==========================================
        const { data: latestIdData, error: idError } =
            await supabase
                .from('telemetry')
                .select('id')
                .order('id', { ascending: false })
                .limit(1)
                .maybeSingle();

        if (idError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get latest id',
                error: idError.message
            });
        }


        // ถ้าไม่มีข้อมูล → เริ่ม 1
        // ถ้ามี → MAX(id) + 1
        const newId =
            latestIdData?.id != null
                ? Number(latestIdData.id) + 1
                : 1;


        // ==========================================
        // หา seq ล่าสุด
        // ==========================================
        const { data: latestSeqData, error: seqError } =
            await supabase
                .from('telemetry')
                .select('seq')
                .order('seq', { ascending: false })
                .limit(1)
                .maybeSingle();

        if (seqError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get latest sequence',
                error: seqError.message
            });
        }


        // ถ้าไม่มีข้อมูล → เริ่ม 1
        // ถ้ามี → MAX(seq) + 1
        const newSeq =
            latestSeqData?.seq != null
                ? Number(latestSeqData.seq) + 1
                : 1;


        // ==========================================
        // INSERT
        // ==========================================
        const { data, error } = await supabase
            .from('telemetry')
            .insert([
                {
                    id: newId,
                    device_id: device_id.trim(),
                    temperature_c: temperature_c,
                    seq: newSeq
                }
            ])
            .select()
            .single();


        if (error) {

            return res.status(500).json({
                success: false,
                message: 'Failed to save temperature',
                error: error.message
            });

        }


        // ==========================================
        // Success
        // ==========================================
        return res.status(201).json({
            success: true,
            message: 'Temperature saved successfully',
            data: data
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }
});


// ==========================================
// GET /api/telemetry
// ดูข้อมูลล่าสุด
// ==========================================
app.get('/api/telemetry', async (req, res) => {

    try {

        const { data, error } = await supabase
            .from('telemetry')
            .select('*')
            .order('recorded_at', { ascending: false })
            .limit(50);


        if (error) {

            return res.status(500).json({
                success: false,
                message: 'Failed to get telemetry',
                error: error.message
            });

        }


        res.json({
            success: true,
            data: data
        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }
});


// ==========================================
// Start Server
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});